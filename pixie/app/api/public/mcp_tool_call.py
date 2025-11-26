"""Public API endpoints for calling MCP tools."""
from logging import getLogger
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client
from pydantic import BaseModel, Field

from app.db.models.tools import McpServerConfiguration, McpServerTransport
from app.db.storage.mcp_tool_repository import McpToolRepository
from app.db.storage.tool_widget_repository import ToolWidgetRepository
from app.db.storage.toolkit_repository import ToolkitRepository
from app.db.storage.toolkit_source_repository import ToolkitSourceRepository
from app.db.storage.widget_repository import WidgetRepository
from app.server.exceptions import NotFoundError
from app.server.project_access import verify_project_id_path
from deploy.utils import get_details_from_external_tool_id

logger = getLogger(__name__)

router = APIRouter(prefix="/projects/{project_id}", tags=["mcp-tool-call"])


class McpToolCallRequest(BaseModel):
    """Request model for calling an MCP tool."""
    tool_name: str = Field(..., description="Name of the tool to call")
    tool_params: dict[str, Any] = Field(default_factory=dict, description="Arguments to pass to the tool")


class McpToolCallResponse(BaseModel):
    """Response model for MCP tool call."""
    tool_name: str = Field(..., description="Name of the tool that was called")
    tool_params: dict[str, Any] = Field(..., description="Parameters that were passed to the tool")
    result: dict[str, Any] | None = Field(default=None, description="Result from the tool call")
    error: str | None = Field(default=None, description="Error message if the tool call failed")


@router.post(
    "/mcp-tool-call/widget/{widget_id}",
    response_model=McpToolCallResponse,
    status_code=status.HTTP_200_OK,
    summary="Call MCP tool via widget and tool ID",
)
async def call_tool_via_widget(
    widget_id: str,
    request: McpToolCallRequest,
    project_id: str = Depends(verify_project_id_path),
) -> McpToolCallResponse:
    """
    Call an MCP tool using widget and tool IDs.
    
    This endpoint:
    1. Validates that tool_id belongs to widget_id
    2. Gets the tool and finds its toolkit
    3. Gets the toolkit_source and MCP server configuration
    4. Connects to the MCP server
    5. Calls the specified tool with the provided arguments
    
    Args:
        widget_id: ID of the widget
        tool_id: ID of the tool
        request: Tool call request with tool_name and arguments
        project_id: Project ID (verified via dependency)
        
    Returns:
        Tool call result or error
    """
    try:
        widget_repo = WidgetRepository()
        tool_repo = McpToolRepository()
        toolkit_repo = ToolkitRepository()
        toolkit_source_repo = ToolkitSourceRepository()
        tool_widget_repo = ToolWidgetRepository()
        
        # Verify widget exists and belongs to project
        widget_repo.get_by_id(widget_id, project_id)
        
        tool_name, toolkit_id, tool_id = get_details_from_external_tool_id(request.tool_name)
        tool_info = tool_repo.get_by_id(tool_id, project_id)
        
        # Verify tool belongs to widget
        tool_widgets = tool_widget_repo.get_by_widget_id(widget_id, project_id)
        tool_ids = [tw.tool_id for tw in tool_widgets]
        if tool_id not in tool_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tool '{request.tool_name}' does not belong to widget '{widget_id}'"
            )

        # Get toolkit
        toolkit = toolkit_repo.get_by_id(tool_info.toolkit_id, project_id)
        
        # Get toolkit_source
        toolkit_source = toolkit_source_repo.get_by_id(toolkit.toolkit_source_id, project_id)
        
        # Validate it's an MCP server source
        if toolkit_source.source_type.value != "mcp_server":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Toolkit source is not an MCP server (type: {toolkit_source.source_type.value})"
            )
        
        # Get MCP server configuration
        config_dict = toolkit_source.configuration
        if isinstance(config_dict, McpServerConfiguration):
            config = config_dict
        elif isinstance(config_dict, dict):
            config = McpServerConfiguration(**config_dict)
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Invalid configuration format for toolkit source: {type(config_dict)}"
            )
        
        # Validate transport is streamable-http
        if config.transport.value != "streamable-http":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported transport type: {config.transport.value}. Only 'streamable-http' is currently supported."
            )
        
        # Connect to MCP server and call tool
        headers: dict[str, str] = {}
        if config.credentials:
            headers = dict(config.credentials)
        
        try:
            async with streamablehttp_client(
                url=config.server_url,
                headers=headers if headers else None,
                timeout=30.0,
            ) as client_data:
                read, write, *_ = client_data
                
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    
                    # Call the tool
                    result = await session.call_tool(tool_info.name, request.tool_params)
                    result = {
                        'structuredContent': result.structuredContent,
                        'content': result.content,
                        'isError': result.isError,
                    }
                    return McpToolCallResponse(
                        tool_name=request.tool_name,
                        tool_params=request.tool_params,
                        result=result,
                        error=None,
                    )
                    
        except Exception as e:
            logger.exception(f"Error calling tool '{tool_name}' (tool_id: {tool_id}) on widget {widget_id}: {str(e)}")
            return McpToolCallResponse(
                tool_name=request.tool_name,
                tool_params=request.tool_params,
                result=None,
                error=f"Failed to call tool: {str(e)}",
            )
            
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error calling tool via widget: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to call tool via widget: {str(e)}"
        )

