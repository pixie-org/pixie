"""MCP chat service for handling MCP server interactions with LLM tool calling."""
import json
import logging
from typing import Any

from anthropic import Anthropic
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

from app.db.models.tools import McpServerConfiguration
from app.server.config import get_settings

logger = logging.getLogger(__name__)


class McpChatService:
    """
    Service for managing MCP chat sessions with LLM-powered tool calling.
    
    This service:
    1. Connects to MCP servers
    2. Lists available tools
    3. Uses LLM to decide which tools to call based on user messages
    4. Executes tool calls
    5. Returns formatted responses
    """

    def __init__(self):
        """Initialize the MCP chat service."""
        settings = get_settings()
        
        # Initialize Anthropic client if API key is provided
        self.anthropic_client: Anthropic | None = None
        if settings.anthropic_api_key:
            try:
                self.anthropic_client = Anthropic(api_key=settings.anthropic_api_key)
                logger.info(f"Anthropic client initialized with model: {settings.claude_model}")
            except Exception as e:
                logger.warning(f"Failed to initialize Anthropic client: {e}")
        
        self.settings = settings

    async def connect_to_mcp_server(
        self, config: McpServerConfiguration
    ) -> tuple[Any, ClientSession, list[dict[str, Any]]]:
        """
        Connect to an MCP server and get available tools.
        
        Args:
            config: MCP server configuration
            
        Returns:
            Tuple of (transport_context, session, tools_list)
            - transport_context: The streamablehttp_client context manager (needs to stay open)
            - session: Active MCP client session
            - tools_list: List of available tools from the server
        """
        if config.transport.value != "streamable-http":
            raise ValueError(
                f"Unsupported transport type: {config.transport.value}. "
                "Only 'streamable-http' is currently supported."
            )

        headers: dict[str, str] = {}
        if config.credentials:
            headers = dict(config.credentials)
        
        try:
            # Create transport context manager but don't enter it yet
            transport = streamablehttp_client(
                url=config.server_url,
                headers=headers if headers else None,
                timeout=30.0,
            )
            
            # Enter the transport context
            client_data = await transport.__aenter__()
            read, write, *_ = client_data
            
            # Create and enter session context
            session = ClientSession(read, write)
            await session.__aenter__()
            await session.initialize()
            
            # List available tools
            result = await session.list_tools()
            
            tools = []
            for tool in result.tools:
                tool_dict: dict[str, Any] = {
                    "name": tool.name,
                    "description": tool.description or "",
                    "inputSchema": tool.inputSchema,
                }
                
                if hasattr(tool, 'title') and tool.title:
                    tool_dict["title"] = tool.title
                
                # Extract outputSchema if available
                if hasattr(tool, 'outputSchema') and tool.outputSchema:
                    tool_dict["outputSchema"] = tool.outputSchema
                
                tools.append(tool_dict)
            
            logger.info(f"Connected to MCP server and found {len(tools)} tools")
            return transport, session, tools
                
        except Exception as e:
            logger.exception(f"Error connecting to MCP server: {str(e)}")
            raise

    async def decide_tool_calls(
        self,
        user_message: str,
        available_tools: list[dict[str, Any]],
        conversation_history: list[dict[str, str]] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Use LLM to decide which tools to call based on user message.
        
        Args:
            user_message: User's message
            available_tools: List of available tools from MCP server
            conversation_history: Previous conversation messages
            
        Returns:
            List of tool call decisions with tool name and arguments
        """
        if not self.anthropic_client:
            logger.warning("No LLM client available, skipping tool calls")
            return []

        # Build system prompt for tool calling
        tool_descriptions = []
        for tool in available_tools:
            tool_info = f"- {tool['name']}: {tool.get('description', 'No description')}"
            if tool.get('title'):
                tool_info += f" (Title: {tool['title']})"
            tool_descriptions.append(tool_info)
        
        tools_section = "\n".join(tool_descriptions) if tool_descriptions else "No tools available."
        
        system_prompt = f"""You are an AI assistant that helps users by calling appropriate tools from an MCP server.

Available Tools:
{tools_section}

Your task:
1. Analyze the user's message
2. Determine if any tools should be called to help answer the user's question
3. If tools are needed, decide which tool(s) to call and what arguments to pass
4. Return your decision as a JSON array of tool calls

Response Format:
Return ONLY a valid JSON array. Each tool call should have:
- "tool_name": The exact name of the tool to call
- "arguments": A dictionary of arguments to pass to the tool (must match the tool's inputSchema)

Example response:
[
  {{
    "tool_name": "greet",
    "arguments": {{"name": "Alice"}}
  }}
]

If no tools are needed, return an empty array: []

Important:
- Only call tools that are actually needed to answer the user's question
- Ensure all arguments match the tool's inputSchema
- You can call multiple tools if needed
- If the user's message doesn't require any tool calls, return an empty array"""

        # Build messages
        messages = []
        if conversation_history:
            # Add conversation history (excluding system messages)
            for msg in conversation_history:
                if msg.get("role") != "system":
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })
        
        # Add current user message
        messages.append({
            "role": "user",
            "content": user_message
        })

        try:
            logger.debug(f"Calling Anthropic API for tool calling decision with model: {self.settings.claude_model}")
            response = self.anthropic_client.messages.create(
                model=self.settings.claude_model,
                max_tokens=1000,
                system=system_prompt,
                messages=messages,  # type: ignore
            )
            
            response_text = response.content[0].text if response.content else "[]"
            logger.info(f"LLM tool calling decision: {response_text[:200]}")
            
            # Parse JSON response
            try:
                # Extract JSON from markdown code blocks if present
                if "```" in response_text:
                    import re
                    json_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', response_text, re.DOTALL)
                    if json_match:
                        response_text = json_match.group(1)
                
                tool_calls = json.loads(response_text.strip())
                if not isinstance(tool_calls, list):
                    logger.warning(f"LLM returned non-list tool calls: {tool_calls}")
                    return []
                
                logger.info(f"Parsed {len(tool_calls)} tool call(s) from LLM response")
                return tool_calls
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse LLM tool calling response as JSON: {e}")
                logger.error(f"Response text: {response_text}")
                return []
                
        except Exception as e:
            logger.error(f"Error getting tool calling decision from LLM: {e}", exc_info=True)
            return []

    async def execute_tool_calls(
        self,
        tool_to_session_map: dict[str, ClientSession],
        tool_calls: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """
        Execute tool calls on the appropriate MCP servers.
        
        Args:
            tool_to_session_map: Dictionary mapping tool names to their MCP client sessions
            tool_calls: List of tool calls to execute
            
        Returns:
            List of tool call results
        """
        results = []
        
        for tool_call in tool_calls:
            tool_name = tool_call.get("tool_name")
            arguments = tool_call.get("arguments", {})
            
            if not tool_name:
                logger.warning(f"Skipping tool call without name: {tool_call}")
                results.append({
                    "tool_name": "unknown",
                    "arguments": arguments,
                    "result": None,
                    "error": "Tool name missing"
                })
                continue
            
            # Find the session for this tool
            session = tool_to_session_map.get(tool_name)
            if not session:
                logger.warning(f"Session not found for tool '{tool_name}'")
                results.append({
                    "tool_name": tool_name,
                    "arguments": arguments,
                    "result": None,
                    "error": f"Tool '{tool_name}' not found in any connected MCP server"
                })
                continue
            
            try:
                logger.info(f"Calling tool '{tool_name}' with arguments: {arguments}")
                result = await session.call_tool(tool_name, arguments)
                
                # Extract content from result
                result_content = None
                if hasattr(result, 'content'):
                    # MCP tool result has content array
                    if result.content:
                        # Extract text from content items
                        text_parts = []
                        for item in result.content:
                            if hasattr(item, 'text'):
                                text_parts.append(item.text)
                            elif isinstance(item, dict) and 'text' in item:
                                text_parts.append(item['text'])
                        result_content = "\n".join(text_parts) if text_parts else str(result)
                    else:
                        result_content = str(result)
                else:
                    result_content = str(result)
                
                results.append({
                    "tool_name": tool_name,
                    "arguments": arguments,
                    "result": result_content,
                    "error": None
                })
                logger.info(f"Tool '{tool_name}' executed successfully")
                
            except Exception as e:
                logger.error(f"Error calling tool '{tool_name}': {e}", exc_info=True)
                results.append({
                    "tool_name": tool_name,
                    "arguments": arguments,
                    "result": None,
                    "error": str(e)
                })
        
        return results

    async def generate_response(
        self,
        user_message: str,
        tool_call_results: list[dict[str, Any]],
        conversation_history: list[dict[str, str]] | None = None,
    ) -> str:
        """
        Generate a natural language response based on tool call results.
        
        Args:
            user_message: User's original message
            tool_call_results: Results from tool executions
            conversation_history: Previous conversation messages
            
        Returns:
            Generated response text
        """
        if not self.anthropic_client:
            # Fallback response
            if tool_call_results:
                results_summary = "\n".join([
                    f"- {r['tool_name']}: {r['result'] if r['result'] else r.get('error', 'No result')}"
                    for r in tool_call_results
                ])
                return f"I executed the following tools:\n{results_summary}\n\nBased on the results, here's the answer to your question: '{user_message}'"
            else:
                return f"Thank you for your message: '{user_message}'. I don't have any tools available to help with this request."

        # Build system prompt
        system_prompt = """You are a helpful AI assistant that uses tools to answer user questions.

When you receive tool call results without any resource with uri starting with 'ui://', analyze them and provide a clear, short and helpful response to the user's question.

Guidelines:
- If tool result contains resource with uri starting with 'ui://', do not provide any additional text.
- Be concise and to the point
- Format your response using Markdown syntax for better readability
- Use Markdown formatting: **bold**, *italic*, `code`, lists, headers, etc.
- Do NOT include HTML tags or React components
- If tool calls failed, explain what went wrong
- If multiple tools were called, synthesize the results into a coherent answer"""

        # Build messages
        messages = []
        if conversation_history:
            # Add conversation history (excluding system messages)
            for msg in conversation_history:
                if msg.get("role") != "system":
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })
        
        # Add current user message
        messages.append({
            "role": "user",
            "content": user_message
        })
        
        # Add tool call results as assistant message
        if tool_call_results:
            tool_results_text = "Tool execution results:\n"
            for result in tool_call_results:
                tool_results_text += f"\nTool: {result['tool_name']}\n"
                tool_results_text += f"Arguments: {json.dumps(result['arguments'], indent=2)}\n"
                if result.get('error'):
                    tool_results_text += f"Error: {result['error']}\n"
                else:
                    tool_results_text += f"Result: {result.get('result', 'No result')}\n"
            
            messages.append({
                "role": "assistant",
                "content": tool_results_text
            })
            
            # Add final user message asking for response
            messages.append({
                "role": "user",
                "content": "Based on the tool execution results, provide a helpful response to my original question."
            })

        try:
            logger.debug(f"Calling Anthropic API for response generation with model: {self.settings.claude_model}")
            response = self.anthropic_client.messages.create(
                model=self.settings.claude_model,
                max_tokens=2000,
                system=system_prompt,
                messages=messages,  # type: ignore
            )
            
            response_text = response.content[0].text if response.content else ""
            logger.info(f"Generated response ({len(response_text)} chars)")
            
            return response_text
            
        except Exception as e:
            logger.error(f"Error generating response: {e}", exc_info=True)
            # Fallback response
            if tool_call_results:
                results_summary = "\n".join([
                    f"- {r['tool_name']}: {r['result'] if r['result'] else r.get('error', 'No result')}"
                    for r in tool_call_results
                ])
                return f"I executed the following tools:\n{results_summary}\n\nBased on the results, here's the answer to your question: '{user_message}'"
            else:
                return f"Thank you for your message: '{user_message}'. I encountered an error while processing your request."

