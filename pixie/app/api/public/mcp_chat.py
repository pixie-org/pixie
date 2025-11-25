"""WebSocket API endpoint for MCP chat conversations."""
import json
import logging
import secrets
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from mcp import ClientSession

from app.api.core.mcp_chat_service import McpChatService
from app.api.models.mcp_chat import (
    McpChatAddServerRequest,
    McpChatInitRequest,
    McpChatMessageRequest,
    McpChatResponse,
    ToolCallResult,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mcp-chat", tags=["mcp-chat"])

# Store active sessions: session_id -> (mcp_service, server_connections, all_tools, tool_to_session_map, conversation_history)
# server_connections: list of (transport, mcp_session, server_url) tuples
# all_tools: aggregated list of all tools from all servers
# tool_to_session_map: dict mapping tool_name -> mcp_session
active_sessions: dict[str, tuple[McpChatService, list[tuple[Any, ClientSession, str]], list[dict[str, Any]], dict[str, ClientSession], list[dict[str, str]]]] = {}


def _generate_session_id() -> str:
    """Generate a random session ID."""
    return secrets.token_hex(8)


async def handle_mcp_chat_message(
    message_data: dict[str, Any],
    websocket: WebSocket,
) -> McpChatResponse:
    """Handle a MCP chat message and return a response."""
    message_type = message_data.get("type")

    if message_type == "init":
        try:
            init_request = McpChatInitRequest(**message_data)
            
            # Initialize MCP chat service
            mcp_service = McpChatService()
            
            # Connect to MCP server and get tools
            transport, mcp_session, tools = await mcp_service.connect_to_mcp_server(init_request.mcp_server)
            
            # Generate session ID
            session_id = _generate_session_id()
            
            # Build tool to session map
            tool_to_session_map = {tool.get("name"): mcp_session for tool in tools}
            
            # Store session (transport needs to stay alive)
            server_connections = [(transport, mcp_session, init_request.mcp_server.server_url)]
            active_sessions[session_id] = (mcp_service, server_connections, tools, tool_to_session_map, [])
            
            logger.info(f"MCP chat session initialized: {session_id} with {len(tools)} tools from 1 server")
            
            # Convert tools to response format
            tools_response = []
            for tool in tools:
                tool_response = {
                    "name": tool.get("name"),
                    "title": tool.get("title"),
                    "description": tool.get("description", ""),
                    "inputSchema": tool.get("inputSchema", {}),
                }
                # Include outputSchema if available
                if tool.get("outputSchema"):
                    tool_response["outputSchema"] = tool.get("outputSchema")
                tools_response.append(tool_response)
            
            return McpChatResponse(
                type="init",
                session_id=session_id,
                content=f"Connected to MCP server. Found {len(tools)} available tool(s). How can I help you?",
                content_format="markdown",
                tools=tools_response,
                server_count=1,
            )
        except Exception as e:
            logger.exception("Error initializing MCP chat session")
            raise ValueError(f"Error initializing MCP chat session: {str(e)}")

    elif message_type == "add_server":
        try:
            add_server_request = McpChatAddServerRequest(**message_data)
            session_id = add_server_request.session_id
            
            # Get session
            if session_id not in active_sessions:
                raise ValueError(f"Session not found: {session_id}")
            
            mcp_service, server_connections, existing_tools, tool_to_session_map, conversation_history = active_sessions[session_id]
            
            # Check if server URL already exists
            server_urls = [conn[2] for conn in server_connections]
            if add_server_request.mcp_server.server_url in server_urls:
                raise ValueError(f"MCP server at {add_server_request.mcp_server.server_url} is already connected")
            
            # Connect to new MCP server and get tools
            transport, mcp_session, new_tools = await mcp_service.connect_to_mcp_server(add_server_request.mcp_server)
            
            # Add to server connections
            server_connections.append((transport, mcp_session, add_server_request.mcp_server.server_url))
            
            # Update tool to session map
            for tool in new_tools:
                tool_name = tool.get("name")
                if tool_name in tool_to_session_map:
                    logger.warning(f"Tool '{tool_name}' already exists from another server. Overwriting mapping.")
                tool_to_session_map[tool_name] = mcp_session
            
            # Merge tools
            all_tools = existing_tools + new_tools
            
            # Update session
            active_sessions[session_id] = (mcp_service, server_connections, all_tools, tool_to_session_map, conversation_history)
            
            logger.info(f"Added MCP server to session {session_id}. Total: {len(server_connections)} servers, {len(all_tools)} tools")
            
            # Convert all tools to response format
            tools_response = []
            for tool in all_tools:
                tools_response.append({
                    "name": tool.get("name"),
                    "title": tool.get("title"),
                    "description": tool.get("description", ""),
                    "inputSchema": tool.get("inputSchema", {}),
                })
            
            return McpChatResponse(
                type="add_server",
                session_id=session_id,
                content=f"Successfully added MCP server. Now connected to {len(server_connections)} server(s) with {len(all_tools)} total tool(s).",
                content_format="markdown",
                tools=tools_response,
                server_count=len(server_connections),
            )
        except ValueError as e:
            logger.error(f"Error adding MCP server: {e}")
            raise
        except Exception as e:
            logger.exception("Error adding MCP server")
            raise ValueError(f"Error adding MCP server: {str(e)}")

    elif message_type == "message":
        try:
            message_request = McpChatMessageRequest(**message_data)
            session_id = message_request.session_id
            
            # Get session
            if session_id not in active_sessions:
                raise ValueError(f"Session not found: {session_id}")
            
            mcp_service, server_connections, tools, tool_to_session_map, conversation_history = active_sessions[session_id]
            
            # Add user message to conversation history
            conversation_history.append({
                "role": "user",
                "content": message_request.content,
            })
            
            # Use LLM to decide which tools to call
            tool_calls = await mcp_service.decide_tool_calls(
                user_message=message_request.content,
                available_tools=tools,
                conversation_history=conversation_history[:-1],  # Exclude current message
            )
            
            # Execute tool calls (routed to correct servers)
            tool_call_results = []
            if tool_calls:
                tool_call_results = await mcp_service.execute_tool_calls(
                    tool_to_session_map=tool_to_session_map,
                    tool_calls=tool_calls,
                )
            
            # Generate response based on tool results
            response_text = await mcp_service.generate_response(
                user_message=message_request.content,
                tool_call_results=tool_call_results,
                conversation_history=conversation_history[:-1],  # Exclude current message
            )
            
            # Add assistant response to conversation history
            conversation_history.append({
                "role": "assistant",
                "content": response_text,
            })
            
            # Update session with new conversation history
            active_sessions[session_id] = (mcp_service, server_connections, tools, tool_to_session_map, conversation_history)
            
            # Convert tool call results to response format
            tool_call_results_response = None
            if tool_call_results:
                tool_call_results_response = [
                    ToolCallResult(
                        tool_name=r["tool_name"],
                        arguments=r["arguments"],
                        result=r.get("result"),
                        error=r.get("error"),
                    )
                    for r in tool_call_results
                ]
            
            return McpChatResponse(
                type="message",
                session_id=session_id,
                content=response_text,
                content_format="markdown",
                tool_calls=tool_call_results_response,
            )
        except ValueError as e:
            logger.error(f"Error processing message: {e}")
            raise
        except Exception as e:
            logger.exception("Error processing message")
            raise ValueError(f"Error processing message: {str(e)}")

    else:
        raise ValueError(f"Unknown message type: {message_type}")


async def cleanup_session(session_id: str) -> None:
    """Clean up a session and close all MCP connections."""
    if session_id in active_sessions:
        _, server_connections, _, _, _ = active_sessions[session_id]
        
        # Close all MCP sessions and transports
        for transport, mcp_session, server_url in server_connections:
            try:
                # Close MCP session
                await mcp_session.__aexit__(None, None, None)
                logger.info(f"Closed MCP session for {server_url} in session_id: {session_id}")
            except Exception as e:
                logger.error(f"Error closing MCP session for {server_url}: {e}")
            
            try:
                # Close transport
                await transport.__aexit__(None, None, None)
                logger.info(f"Closed transport for {server_url} in session_id: {session_id}")
            except Exception as e:
                logger.error(f"Error closing transport for {server_url}: {e}")
        
        del active_sessions[session_id]
        logger.info(f"Cleaned up session: {session_id}")


@router.websocket("/ws")
async def websocket_mcp_chat(websocket: WebSocket):
    """
    WebSocket endpoint for MCP chat conversations.
    
    **WebSocket URL**: `ws://localhost:8000/api/v1/mcp-chat/ws` (or `wss://` for secure connections)
    
    Message Flow:
    1. Client sends init message: {"type": "init", "mcp_server": {...}}
       - Server connects to MCP server
       - Returns session_id and list of available tools
    2. (Optional) Client sends add_server message: {"type": "add_server", "session_id": "...", "mcp_server": {...}}
       - Server connects to additional MCP server
       - Returns updated list of all available tools from all servers
    3. Client sends messages: {"type": "message", "session_id": "...", "content": "..."}
       - Server uses LLM to decide which tools to call (from any connected server)
       - Server executes tool calls on appropriate MCP servers
       - Server generates response based on tool results
       - Returns response with tool call results
    """
    await websocket.accept()
    logger.info("WebSocket connection accepted for MCP chat")
    
    session_id: str | None = None

    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"Received message: {data}")

            try:
                message_data = json.loads(data)
                response = await handle_mcp_chat_message(message_data, websocket)
                
                # Track session_id for cleanup
                if response.session_id:
                    session_id = response.session_id
                
                response_json = response.model_dump_json(exclude_none=True)
                await websocket.send_text(response_json)
                logger.info(f"Sent response: {response_json[:200]}...")

            except ValueError as e:
                error_response = McpChatResponse(
                    type="error",
                    session_id=session_id,
                    content=str(e),
                )
                await websocket.send_text(error_response.model_dump_json(exclude_none=True))
                logger.error(f"Error processing message: {e}")

            except json.JSONDecodeError:
                error_response = McpChatResponse(
                    type="error",
                    session_id=session_id,
                    content="Invalid JSON format",
                )
                await websocket.send_text(error_response.model_dump_json(exclude_none=True))
                logger.error("Invalid JSON received")

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.exception("WebSocket error")
        try:
            error_response = McpChatResponse(
                type="error",
                session_id=session_id,
                content=f"Server error: {str(e)}",
            )
            await websocket.send_text(error_response.model_dump_json(exclude_none=True))
        except Exception:
            pass  # Connection may be closed
    finally:
        # Cleanup session
        if session_id:
            await cleanup_session(session_id)
        logger.info("WebSocket connection closed")

