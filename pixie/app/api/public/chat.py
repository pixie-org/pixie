"""WebSocket and REST API endpoints for widget conversations."""
import json
import logging
import secrets
from typing import Any

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, status

from app.api.core.llm_chat import LlmChat
from app.api.utils.llm_check import require_llm_keys
from app.api.models.chat import (
    WidgetChatInitRequest,
    WidgetChatMessageRequest,
    WidgetChatResponse,
    WidgetMessageData,
)
from app.api.models.tools import ToolResponse
from app.db.models.chat import Message, MessageRole
from app.db.models.widgets import UiWidgetResource
from app.db.storage.mcp_tool_repository import McpToolRepository
from app.db.storage.tool_widget_repository import ToolWidgetRepository
from app.db.storage.ui_widget_resource_repository import UiWidgetResourceRepository
from app.db.storage.widget_chat_repository import WidgetChatRepository
from app.db.storage.widget_repository import WidgetRepository
from app.server.exceptions import NotFoundError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat/widgets", tags=["widget-chat"])


def _convert_message_to_data(msg: Message) -> WidgetMessageData:
    """Convert Message to WidgetMessageData."""
    return WidgetMessageData(
        message_id=msg.id,
        role=msg.role.value if isinstance(msg.role, MessageRole) else str(msg.role),
        content=msg.content,
        ui_resource_id=msg.ui_resource_id,
        created_at=msg.created_at.isoformat() if msg.created_at else None,
    )


async def handle_widget_chat_message(
    message_data: dict[str, Any], repository: WidgetChatRepository
) -> WidgetChatResponse:
    """Handle a widget chat message and return a response."""
    message_type = message_data.get("type")

    if message_type == "init":
        try:
            init_request = WidgetChatInitRequest(**message_data)
            widget_repo = WidgetRepository()
            widget = widget_repo.get_by_id(init_request.widget_id)

            conversation = repository.get_or_create_conversation(
                widget_id=init_request.widget_id
            )

            previous_messages = repository.list_messages(conversation.id)
            message_list = [_convert_message_to_data(msg) for msg in previous_messages]

            if not previous_messages:
                repository.create_message(
                    conversation_id=conversation.id,
                    role="system",
                    content=f"Conversation initialized for widget: {widget.name}",
                )
                system_msg = repository.list_messages(conversation.id)[-1]
                message_list.append(_convert_message_to_data(system_msg))

            resource_repo = UiWidgetResourceRepository()
            latest_resource = resource_repo.get_latest_by_widget_id(init_request.widget_id)
            ui_resource_id = latest_resource.id if latest_resource else None
            
            is_new = len(previous_messages) == 0
            content_message = (
                "Conversation initialized. How can I help you?"
                if is_new
                else f"Resumed conversation with {len(message_list)} previous messages."
            )
            return WidgetChatResponse(
                type="init",
                conversation_id=conversation.id,
                content=content_message,
                content_format="markdown",
                ui_resource_id=ui_resource_id,
                messages=message_list if message_list else None,
            )
        except NotFoundError as e:
            logger.error(f"Widget not found: {e}")
            raise ValueError(f"Widget not found: {e.detail}")
        except Exception as e:
            logger.exception("Error initializing widget conversation")
            raise ValueError(f"Error initializing conversation: {str(e)}")

    elif message_type == "message":
        # Check if LLM keys are configured
        require_llm_keys()
        
        try:
            message_request = WidgetChatMessageRequest(**message_data)

            conversation = repository.get_conversation(message_request.conversation_id)

            tool_widget_repo = ToolWidgetRepository()
            tool_widgets = tool_widget_repo.get_by_widget_id(conversation.widget_id)
            tool_ids = [tw.tool_id for tw in tool_widgets]

            previous_messages = repository.list_messages(message_request.conversation_id)

            repository.create_message(
                conversation_id=message_request.conversation_id,
                role="user",
                content=message_request.content,
            )

            tool_repo = McpToolRepository()
            tools = [tool_repo.get_by_id(tool_id) for tool_id in tool_ids]

            llm_chat = LlmChat()
            response_text, ui_resource_dict = llm_chat.generate_response(
                widget_id=conversation.widget_id,
                tools=tools,
                user_message=message_request.content,
                previous_messages=previous_messages,
            )

            ui_resource_id = None
            if ui_resource_dict:
                resource_repo = UiWidgetResourceRepository()
                created = resource_repo.create(UiWidgetResource(
                    id=secrets.token_hex(4),
                    widget_id=conversation.widget_id,
                    resource=ui_resource_dict,
                ))
                ui_resource_id = created.id

            repository.create_message(
                conversation_id=message_request.conversation_id,
                role="assistant",
                content=response_text,
                ui_resource_id=ui_resource_id,
            )

            return WidgetChatResponse(
                type="message",
                conversation_id=message_request.conversation_id,
                content=response_text,
                content_format="markdown",
                ui_resource_id=ui_resource_id,
            )
        except NotFoundError as e:
            logger.error(f"Conversation not found: {e}")
            raise ValueError(f"Conversation not found: {e.detail}")
        except Exception as e:
            logger.exception("Error processing message")
            raise ValueError(f"Error processing message: {str(e)}")

    else:
        raise ValueError(f"Unknown message type: {message_type}")


@router.get(
    "/{widget_id}/conversation",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Get or create conversation for a widget",
)
def get_widget_conversation(widget_id: str) -> dict:
    """
    Get or create a conversation for a widget.
    
    Returns the conversation ID. If a conversation already exists for this widget,
    returns the existing one.
    """
    try:
        widget_repo = WidgetRepository()
        chat_repo = WidgetChatRepository()
        
        # Verify widget exists
        widget = widget_repo.get_by_id(widget_id)
        
        # Get or create conversation
        conversation = chat_repo.get_or_create_conversation(widget_id)
        
        return {
            "conversation_id": conversation.id,
            "widget_id": widget_id,
            "created_at": conversation.created_at.isoformat() if conversation.created_at else None,
        }
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except Exception as e:
        logger.exception(f"Error getting widget conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversation: {str(e)}"
        )


@router.get(
    "/{widget_id}/conversation/{conversation_id}/messages",
    response_model=list[WidgetMessageData],
    status_code=status.HTTP_200_OK,
    summary="Get all messages for a widget conversation",
)
def get_widget_conversation_messages(widget_id: str, conversation_id: str) -> list[WidgetMessageData]:
    """Get all messages for a widget conversation."""
    try:
        widget_repo = WidgetRepository()
        chat_repo = WidgetChatRepository()
        
        widget_repo.get_by_id(widget_id)
        conversation = chat_repo.get_conversation(conversation_id)
        
        if conversation.widget_id != widget_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found for this widget"
            )
        
        messages = chat_repo.list_messages(conversation_id)
        
        return [_convert_message_to_data(msg) for msg in messages]
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting conversation messages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get messages: {str(e)}"
        )


@router.websocket("/ws")
async def websocket_widget_chat(websocket: WebSocket):
    """
    WebSocket endpoint for widget chat conversations.
    
    **WebSocket URL**: `ws://localhost:8000/api/v1/chat/widgets/ws` (or `wss://` for secure connections)
    
    Message Flow:
    1. Client sends init message: {"type": "init", "widget_id": "..."}
       - Server gets or creates conversation (returns existing conversation_id if found)
       - Returns conversation_id with latest UI resource and all previous messages
    2. Client sends messages: {"type": "message", "conversation_id": "...", "content": "..."}
       - Server processes message and returns response with text and optional UI resource
    
    Note: The same conversation_id is returned if a conversation already exists for the
    given widget_id, allowing conversation resumption.
    """
    await websocket.accept()
    logger.info("WebSocket connection accepted for widget chat")

    repository = WidgetChatRepository()

    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"Received message: {data}")

            try:
                message_data = json.loads(data)
                response = await handle_widget_chat_message(message_data, repository)
                response_json = response.model_dump_json(exclude_none=True)
                await websocket.send_text(response_json)
                logger.info(f"Sent response: {response_json}")

            except ValueError as e:
                error_response = {
                    "type": "error",
                    "content": str(e),
                }
                await websocket.send_text(json.dumps(error_response))
                logger.error(f"Error processing message: {e}")

            except json.JSONDecodeError:
                error_response = {
                    "type": "error",
                    "content": "Invalid JSON format",
                }
                await websocket.send_text(json.dumps(error_response))
                logger.error("Invalid JSON received")

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.exception("WebSocket error")
        try:
            error_response = {
                "type": "error",
                "content": f"Server error: {str(e)}",
            }
            await websocket.send_text(json.dumps(error_response))
        except Exception:
            pass  # Connection may be closed
    finally:
        logger.info("WebSocket connection closed")

