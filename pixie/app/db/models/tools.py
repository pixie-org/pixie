"""Database models/schemas for tables."""
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ToolSourceType(str, Enum):
    OPENAPI_SPEC = "openapi_spec"
    MCP_SERVER = "mcp_server"

class McpServerTransport(str, Enum):
    STREAMABLE_HTTP = "streamable-http"
    STDIO = "stdio"
    SSE = "sse"

class AuthenticationType(str, Enum):
    NO_AUTH = "no_auth"
    BEARER_TOKEN = "bearer_token"
    OAUTH2 = "oauth2"

class AuthenticationConfiguration(BaseModel):
    type: AuthenticationType = Field(..., description="Type of the authentication")
    bearer_token: str | None = Field(default=None, description="Bearer token of the authentication")
    oauth2_client_id: str | None = Field(default=None, description="OAuth2 client ID for custom OAuth credentials")
    oauth2_client_secret: str | None = Field(default=None, description="OAuth2 client secret for custom OAuth credentials")
    oauth2_scope: list[str] | None = Field(default=None, description="OAuth2 scopes")

class OpenApiSpecConfiguration(BaseModel):
    endpoint: str = Field(..., description="Endpoint of the API")
    openapi_spec: str = Field(..., description="OpenAPI specification for the tool")

class McpServerConfiguration(BaseModel):
    server_url: str = Field(..., description="URL of the MCP server")
    transport: McpServerTransport = Field(..., description="Transport of the MCP server")
    auth_config: AuthenticationConfiguration = Field(..., description="Authentication configuration of the MCP server")
    custom_headers: dict[str, str] | None = Field(default=None, description="Custom headers to include in requests")
    request_timeout: float | None = Field(default=None, description="Request timeout in seconds")

class ToolkitSource(BaseModel):
    id: str = Field(..., description="Unique identifier for the toolkit source")
    created_at: datetime | None = Field(default=None, description="The timestamp when the toolkit source was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the toolkit source was last updated")
    name: str = Field(..., description="Name of the toolkit source")
    source_type: ToolSourceType = Field(..., description="Type of the toolkit source")
    description: str | None = Field(default=None, description="Human-readable description of the toolkit source functionality")
    configuration: OpenApiSpecConfiguration | McpServerConfiguration = Field(..., description="Configuration of the toolkit source")
    project_id: str = Field(..., description="Project ID that the toolkit source belongs to")

class Toolkit(BaseModel):
    id: str = Field(..., description="Unique identifier for the toolkit")
    created_at: datetime | None = Field(default=None, description="The timestamp when the toolkit was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the toolkit was last updated")
    name: str = Field(..., description="Name of the toolkit")
    toolkit_source_id: str = Field(..., description="Toolkit source ID that the toolkit belongs to")
    description: str | None = Field(default=None, description="Description of the toolkit")
    project_id: str = Field(..., description="Project ID that the toolkit belongs to")

class Tool(BaseModel):
    """MCP-compliant tool model (reference: https://modelcontextprotocol.io/specification/2025-06-18/server/tools#tool)"""
    id: str = Field(..., description="Unique identifier for the tool")
    toolkit_id: str = Field(..., description="Toolkit ID that the tool belongs to")
    created_at: datetime | None = Field(default=None, description="The timestamp when the tool was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the tool was last updated")
    name: str = Field(..., description="Unique name identifier for the tool")
    title: str | None = Field(default=None, description="Optional human-readable name of the tool for display purposes")
    description: str | None = Field(default=None, description="Optional human-readable description of functionality")
    inputSchema: dict[str, Any] = Field(..., description="JSON Schema defining expected parameters")
    outputSchema: dict[str, Any] | None = Field(default=None, description="Optional JSON Schema defining expected output structure")
    annotations: dict[str, Any] | None = Field(default=None, description="Optional properties describing tool behavior")
    is_enabled: bool = Field(..., description="Whether the tool is enabled")
    project_id: str = Field(..., description="Project ID that the tool belongs to")
