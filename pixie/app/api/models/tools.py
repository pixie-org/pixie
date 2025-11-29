"""Tool-related Pydantic schemas."""
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

from app.db.models.tools import McpServerConfiguration as McpServerConfigurationDB
from app.db.models.tools import OpenApiSpecConfiguration as OpenApiSpecConfigurationDB


class ToolSourceType(str, Enum):
    OPENAPI_SPEC = "openapi_spec"
    MCP_SERVER = "mcp_server"


class OpenApiSpecConfiguration(OpenApiSpecConfigurationDB):
    pass


class McpServerConfiguration(McpServerConfigurationDB):
    pass


# ============================================================================
# ToolkitSource Models
# ============================================================================

class ToolkitSourceCreate(BaseModel):
    """Schema for creating a toolkit source."""
    name: str = Field(..., description="Name of the toolkit source", min_length=1)
    source_type: ToolSourceType = Field(..., description="Type of the toolkit source")
    description: str | None = Field(default=None, description="Human-readable description of the toolkit source functionality")
    configuration: OpenApiSpecConfiguration | McpServerConfiguration = Field(..., description="Configuration of the toolkit source")


class ToolkitSourceResponse(BaseModel):
    """Schema for toolkit source response."""
    id: str = Field(..., description="Unique identifier for the toolkit source")
    created_at: datetime | None = Field(default=None, description="The timestamp when the toolkit source was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the toolkit source was last updated")
    name: str = Field(..., description="Name of the toolkit source")
    source_type: ToolSourceType = Field(..., description="Type of the toolkit source")
    description: str | None = Field(default=None, description="Human-readable description of the toolkit source functionality")
    configuration: OpenApiSpecConfiguration | McpServerConfiguration = Field(..., description="Configuration of the toolkit source")


class ToolkitSourceListResponse(BaseModel):
    """Schema for toolkit source list item."""
    id: str = Field(..., description="Unique identifier for the toolkit source")
    name: str = Field(..., description="Name of the toolkit source")
    source_type: ToolSourceType = Field(..., description="Type of the toolkit source")
    description: str | None = Field(default=None, description="Human-readable description")


# ============================================================================
# Toolkit Models
# ============================================================================

class ToolkitCreate(BaseModel):
    """Schema for creating a toolkit."""
    name: str = Field(..., description="Name of the toolkit", min_length=1)
    toolkit_source_id: str = Field(..., description="Toolkit source ID that the toolkit belongs to")
    description: str | None = Field(default=None, description="Description of the toolkit")


class ToolkitUpdate(BaseModel):
    """Schema for updating a toolkit. Only name and description can be updated."""
    name: str | None = Field(default=None, description="Name of the toolkit", min_length=1)
    description: str | None = Field(default=None, description="Description of the toolkit")


class ToolkitResponse(BaseModel):
    """Schema for toolkit response. Includes toolkit source information."""
    id: str = Field(..., description="Unique identifier for the toolkit")
    created_at: datetime | None = Field(default=None, description="The timestamp when the toolkit was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the toolkit was last updated")
    name: str = Field(..., description="Name of the toolkit")
    toolkit_source_id: str = Field(..., description="Toolkit source ID that the toolkit belongs to")
    toolkit_source: ToolkitSourceResponse = Field(..., description="Toolkit source information")


class ToolkitListResponse(BaseModel):
    """Schema for toolkit list item."""
    id: str = Field(..., description="Unique identifier for the toolkit")
    name: str = Field(..., description="Name of the toolkit")
    toolkit_source_id: str = Field(..., description="Toolkit source ID that the toolkit belongs to")
    created_at: datetime | None = Field(default=None, description="The timestamp when the toolkit was created")


# ============================================================================
# Tool Models (MCP-compliant)
# ============================================================================

class ToolCreateRequest(BaseModel):
    """Schema for creating a tool."""
    toolkit_id: str = Field(..., description="Toolkit ID that the tool belongs to")
    name: str = Field(..., description="Unique name identifier for the tool", min_length=1)
    title: str | None = Field(default=None, description="Optional human-readable name of the tool for display purposes")
    description: str = Field(..., description="Human-readable description of functionality", min_length=1)
    inputSchema: dict[str, Any] = Field(..., description="JSON Schema defining expected parameters")
    outputSchema: dict[str, Any] | None = Field(default=None, description="Optional JSON Schema defining expected output structure")
    annotations: dict[str, Any] | None = Field(default=None, description="Optional properties describing tool behavior")


class ToolUpdateRequest(BaseModel):
    """Schema for updating a tool. Only name, title, description, inputSchema, outputSchema, and annotations can be updated."""
    name: str | None = Field(default=None, description="Unique name identifier for the tool", min_length=1)
    title: str | None = Field(default=None, description="Optional human-readable name of the tool for display purposes")
    description: str | None = Field(default=None, description="Human-readable description of functionality", min_length=1)
    inputSchema: dict[str, Any] | None = Field(default=None, description="JSON Schema defining expected parameters")
    outputSchema: dict[str, Any] | None = Field(default=None, description="Optional JSON Schema defining expected output structure")
    annotations: dict[str, Any] | None = Field(default=None, description="Optional properties describing tool behavior")


class ToolResponse(BaseModel):
    """Schema for tool response."""
    id: str = Field(..., description="Unique identifier for the tool")
    toolkit_id: str = Field(..., description="Toolkit ID that the tool belongs to")
    created_at: datetime | None = Field(default=None, description="The timestamp when the tool was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the tool was last updated")
    name: str = Field(..., description="Unique name identifier for the tool")
    title: str | None = Field(default=None, description="Optional human-readable name of the tool for display purposes")
    description: str = Field(..., description="Human-readable description of functionality")
    inputSchema: dict[str, Any] = Field(..., description="JSON Schema defining expected parameters")
    outputSchema: dict[str, Any] | None = Field(default=None, description="Optional JSON Schema defining expected output structure")
    annotations: dict[str, Any] | None = Field(default=None, description="Optional properties describing tool behavior")
    is_enabled: bool = Field(..., description="Whether the tool is enabled")


class ToolListResponse(BaseModel):
    """Schema for MCP-compliant tool list item."""
    id: str = Field(..., description="Unique identifier for the tool")
    toolkit_id: str = Field(..., description="Toolkit ID that the tool belongs to")
    name: str = Field(..., description="Unique name identifier for the tool")
    title: str | None = Field(default=None, description="Optional human-readable name of the tool")
    description: str = Field(..., description="Human-readable description of functionality")
    is_enabled: bool = Field(..., description="Whether the tool is enabled")
    hasOutputSchema: bool = Field(..., description="Whether the tool has an output schema defined")


class ToolImportRequest(BaseModel):
    """Schema for importing a tool (toolkit_id is provided in the URL)."""
    name: str = Field(..., description="Unique name identifier for the tool", min_length=1)
    title: str | None = Field(default=None, description="Optional human-readable name of the tool for display purposes")
    description: str | None = Field(default=None, description="Optional human-readable description of functionality")
    inputSchema: dict[str, Any] = Field(..., description="JSON Schema defining expected parameters")
    outputSchema: dict[str, Any] | None = Field(default=None, description="Optional JSON Schema defining expected output structure")
    annotations: dict[str, Any] | None = Field(default=None, description="Optional properties describing tool behavior")


class InferOutputSchemaRequest(BaseModel):
    """Schema for inferring output schema from tool execution."""
    tool_output: Any = Field(..., description="The actual output from the tool call")


class InferOutputSchemaResponse(BaseModel):
    """Schema for inferred output schema response."""
    inferred_schema: dict[str, Any] = Field(..., description="Inferred JSON Schema for the tool output")
    tool_output: Any = Field(..., description="The actual tool output that was used for inference")
