"""MCP chat-related Pydantic schemas."""
from typing import Any

from pydantic import BaseModel, Field

from app.db.models.tools import McpServerConfiguration


class McpChatInitRequest(BaseModel):
    """Request to initialize a new MCP chat session."""
    type: str = Field(..., description="Message type, should be 'init'")
    mcp_server: McpServerConfiguration = Field(..., description="MCP server configuration")


class McpChatAddServerRequest(BaseModel):
    """Request to add an additional MCP server to an existing session."""
    type: str = Field(..., description="Message type, should be 'add_server'")
    session_id: str = Field(..., description="Session ID")
    mcp_server: McpServerConfiguration = Field(..., description="MCP server configuration to add")


class McpChatMessageRequest(BaseModel):
    """Request to send a message in an existing MCP chat session."""
    type: str = Field(..., description="Message type, should be 'message'")
    session_id: str = Field(..., description="Session ID")
    content: str = Field(..., description="Message content/text")


class ToolCallResult(BaseModel):
    """Result of a tool call."""
    tool_name: str = Field(..., description="Name of the tool that was called")
    arguments: dict[str, Any] = Field(..., description="Arguments passed to the tool")
    result: Any = Field(..., description="Result from the tool execution")
    error: str | None = Field(default=None, description="Error message if tool call failed")


class McpChatResponse(BaseModel):
    """Response from the MCP chat endpoint."""
    type: str = Field(..., description="Response type: 'init', 'add_server', 'message', 'error'")
    session_id: str | None = Field(default=None, description="Session ID")
    content: str = Field(..., description="Response text content (Markdown formatted)")
    content_format: str = Field(
        default="markdown",
        description="Content format - 'markdown' or 'plain'"
    )
    tools: list[dict[str, Any]] | None = Field(
        default=None,
        description="List of available tools. Included on 'init' and 'add_server' type responses."
    )
    tool_calls: list[ToolCallResult] | None = Field(
        default=None,
        description="Tool calls made during message processing. Only included on 'message' type responses."
    )
    server_count: int | None = Field(
        default=None,
        description="Number of MCP servers connected in this session. Included on 'init' and 'add_server' responses."
    )

