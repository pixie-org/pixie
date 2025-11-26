"""Database models/schemas for chat-related tables."""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class MessageRole(str, Enum):
    """Message role enum matching database message_role type."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class Conversation(BaseModel):
    """Conversation model representing a chat conversation."""
    id: str = Field(..., description="Unique identifier for the conversation")
    created_at: datetime | None = Field(default=None, description="The timestamp when the conversation was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the conversation was last updated")
    widget_id: str = Field(..., description="Widget ID that the conversation belongs to")
    project_id: str = Field(..., description="Project ID that the conversation belongs to")

class Message(BaseModel):
    """Message model representing a message in a chat conversation."""
    id: str = Field(..., description="Unique identifier for the message")
    created_at: datetime | None = Field(default=None, description="The timestamp when the message was created")
    conversation_id: str = Field(..., description="Conversation ID that the message belongs to")
    role: MessageRole = Field(..., description="Role of the message sender")
    content: str = Field(..., description="Message content")
    ui_resource_id: str | None = Field(default=None, description="UI resource ID that the message belongs to")
    project_id: str = Field(..., description="Project ID that the message belongs to")

