"""Widget chat-related Pydantic schemas."""
from typing import Any

from pydantic import BaseModel, Field

# ============================================================================
# Widget Chat Models
# ============================================================================

class WidgetChatInitRequest(BaseModel):
    """Request to initialize a new widget chat conversation."""
    type: str = Field(..., description="Message type, should be 'init'")
    widget_id: str = Field(..., description="Widget ID")


class WidgetChatMessageRequest(BaseModel):
    """Request to send a message in an existing widget chat conversation."""
    type: str = Field(..., description="Message type, should be 'message'")
    conversation_id: str = Field(..., description="Conversation ID")
    content: str = Field(..., description="Message content/text")


class WidgetMessageData(BaseModel):
    """Message data for widget chat response."""
    message_id: str = Field(..., description="Message ID")
    role: str = Field(..., description="Message role (user, assistant, system)")
    content: str = Field(..., description="Message content")
    ui_resource_id: str | None = Field(default=None, description="UI resource ID if present")
    created_at: str | None = Field(default=None, description="Message creation timestamp")


class WidgetChatResponse(BaseModel):
    """Response from the widget chat endpoint."""
    type: str = Field(..., description="Response type")
    conversation_id: str | None = Field(default=None, description="Conversation ID")
    content: str = Field(..., description="Response text content (Markdown formatted)")
    content_format: str = Field(
        default="markdown",
        description="Content format - 'markdown' or 'plain'. Frontend should render as Markdown when 'markdown'."
    )
    ui_resource_id: str | None = Field(default=None, description="UI resource ID if updated")
    messages: list[WidgetMessageData] | None = Field(
        default=None, 
        description="Previous messages in the conversation. Only included on 'init' type responses to restore conversation history when resuming."
    )

