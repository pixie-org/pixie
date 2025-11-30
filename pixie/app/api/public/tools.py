"""Public API endpoints for ToolkitSource, Toolkit, and Tool CRUD operations."""
import json
import secrets
from logging import getLogger
from typing import Any

import yaml
from fastapi import APIRouter, Depends, HTTPException, Query, status
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

from app.api.models.tools import (
    InferOutputSchemaRequest,
    InferOutputSchemaResponse,
    ToolCreateRequest,
    ToolImportRequest,
    ToolkitCreate,
    ToolkitListResponse,
    ToolkitResponse,
    ToolkitSourceCreate,
    ToolkitSourceListResponse,
    ToolkitSourceResponse,
    ToolkitUpdate,
    ToolListResponse,
    ToolResponse,
    ToolSourceType,
    ToolUpdateRequest,
)
from app.db.models.tools import (
    McpServerConfiguration,
    OpenApiSpecConfiguration,
    Tool,
    Toolkit,
    ToolkitSource,
)
from app.api.core.tool_schema import infer_output_schema
from app.api.utils.llm_check import require_llm_keys
from app.db.storage.mcp_tool_repository import McpToolRepository
from app.db.storage.toolkit_repository import ToolkitRepository
from app.db.storage.toolkit_source_repository import ToolkitSourceRepository
from app.server.exceptions import NotFoundError
from app.server.project_access import verify_project_id_path

logger = getLogger(__name__)

router = APIRouter(prefix="/projects/{project_id}", tags=["tools"])


def _generate_id() -> str:
    """Generate a random hexadecimal ID."""
    return secrets.token_hex(4)



@router.post(
    "/toolkit-sources",
    response_model=ToolkitSourceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a toolkit source",
)
async def create_toolkit_source(
    toolkit_source_data: ToolkitSourceCreate,
    project_id: str = Depends(verify_project_id_path),
) -> ToolkitSourceResponse:
    """
    Create a new toolkit source.
    
    Toolkit sources cannot be updated once created.
    
    For MCP server sources, validates the connection before creating.
    For OpenAPI spec sources, validates that the spec is valid JSON or YAML.
    """
    try:
        if toolkit_source_data.source_type == ToolSourceType.MCP_SERVER:
            if not isinstance(toolkit_source_data.configuration, McpServerConfiguration):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid configuration: expected McpServerConfiguration for MCP server source"
                )
        elif toolkit_source_data.source_type == ToolSourceType.OPENAPI_SPEC:
            if not isinstance(toolkit_source_data.configuration, OpenApiSpecConfiguration):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid configuration: expected OpenApiSpecConfiguration for OpenAPI spec source"
                )
            validate_openapi_spec(toolkit_source_data.configuration)
        repo = ToolkitSourceRepository()
        
        # Generate ID
        toolkit_source_id = _generate_id()

        # Create toolkit source model
        toolkit_source = ToolkitSource(
            id=toolkit_source_id,
            name=toolkit_source_data.name,
            source_type=toolkit_source_data.source_type,
            description=toolkit_source_data.description,
            configuration=toolkit_source_data.configuration,
            project_id=project_id,
        )
        
        created = repo.create(toolkit_source)
        
        return ToolkitSourceResponse.model_validate(created.model_dump())
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error creating toolkit source: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create toolkit source: {str(e)}"
        )


@router.get(
    "/toolkit-sources",
    response_model=list[ToolkitSourceListResponse],
    status_code=status.HTTP_200_OK,
    summary="List all toolkit sources",
)
def list_toolkit_sources(
    project_id: str = Depends(verify_project_id_path),
) -> list[ToolkitSourceListResponse]:
    """List all toolkit sources for a project."""
    try:
        
        repo = ToolkitSourceRepository()
        sources = repo.list_all(project_id=project_id)
        
        return [
            ToolkitSourceListResponse.model_validate(s.model_dump()) for s in sources
        ]
    except Exception as e:
        logger.exception(f"Error listing toolkit sources: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list toolkit sources: {str(e)}"
        )


@router.get(
    "/toolkit-sources/{toolkit_source_id}",
    response_model=ToolkitSourceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a toolkit source",
)
def get_toolkit_source(
    toolkit_source_id: str,
    project_id: str = Depends(verify_project_id_path),
) -> ToolkitSourceResponse:
    """Get a toolkit source by ID."""
    try:
        
        repo = ToolkitSourceRepository()
        source = repo.get_by_id(toolkit_source_id, project_id=project_id)
        
        return ToolkitSourceResponse.model_validate(source.model_dump())
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except Exception as e:
        logger.exception(f"Error getting toolkit source: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get toolkit source: {str(e)}"
        )


@router.delete(
    "/toolkit-sources/{toolkit_source_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a toolkit source",
)
def delete_toolkit_source(
    toolkit_source_id: str,
    project_id: str = Depends(verify_project_id_path),
) -> None:
    """
    Delete a toolkit source.
    
    Cannot delete if there are toolkits using this source.
    """
    try:
        
        repo = ToolkitSourceRepository()
        
        # Check if any toolkits are using this source
        toolkit_count = repo.count_toolkits_using_source(toolkit_source_id, project_id=project_id)
        if toolkit_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete toolkit source: {toolkit_count} toolkit(s) are using this source"
            )
        
        # Verify it exists and belongs to project
        repo.get_by_id(toolkit_source_id, project_id=project_id)
        
        # Delete
        deleted = repo.delete(toolkit_source_id, project_id=project_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Toolkit source with ID '{toolkit_source_id}' not found"
            )
        
        return None
    except HTTPException:
        raise
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except Exception as e:
        logger.exception(f"Error deleting toolkit source: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete toolkit source: {str(e)}"
        )



@router.post(
    "/toolkits",
    response_model=ToolkitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a toolkit",
)
async def create_toolkit(
    toolkit_data: ToolkitCreate,
    project_id: str = Depends(verify_project_id_path),
) -> ToolkitResponse:
    """
    Create a new toolkit.
    
    If the toolkit source is an MCP server, automatically fetches and imports all tools
    from that MCP server into the newly created toolkit.
    
    If the toolkit source is an OpenAPI spec, automatically extracts and imports all tools
    from the OpenAPI specification into the newly created toolkit.
    """
    try:
        
        toolkit_repo = ToolkitRepository()
        source_repo = ToolkitSourceRepository()
        tool_repo = McpToolRepository()
        
        # Verify toolkit source exists and belongs to project
        toolkit_source = source_repo.get_by_id(toolkit_data.toolkit_source_id, project_id=project_id)
        
        # Generate ID
        toolkit_id = _generate_id()
        
        # Create toolkit model
        # toolkit_source_project_id should match project_id for referential integrity
        toolkit = Toolkit(
            id=toolkit_id,
            name=toolkit_data.name,
            toolkit_source_id=toolkit_data.toolkit_source_id,
            toolkit_source_project_id=project_id,
            description=toolkit_data.description,
            project_id=project_id,
        )
        
        created = toolkit_repo.create(toolkit)
        
        # If OpenAPI spec source, automatically extract and import tools
        if toolkit_source.source_type == ToolSourceType.OPENAPI_SPEC:
            if not isinstance(toolkit_source.configuration, OpenApiSpecConfiguration):
                logger.warning(
                    f"Toolkit source {toolkit_source.id} is OPENAPI_SPEC but configuration is not OpenApiSpecConfiguration"
                )
            else:
                try:
                    logger.info(f"Automatically importing tools from OpenAPI spec for toolkit {created.id}")
                    openapi_tools = extract_tools_from_openapi_spec(toolkit_source.configuration)
                    
                    if openapi_tools:
                        imported_count = 0
                        for openapi_tool in openapi_tools:
                            try:
                                tool_name = openapi_tool.get("name")
                                if not tool_name:
                                    logger.warning(f"Skipping tool without name: {openapi_tool}")
                                    continue
                                
                                tool_id = _generate_id()
                                
                                tool = Tool(
                                    id=tool_id,
                                    toolkit_id=created.id,
                                    name=tool_name,
                                    title=openapi_tool.get("title"),
                                    description=openapi_tool.get("description", ""),
                                    inputSchema=openapi_tool.get("inputSchema", {}),
                                    outputSchema=openapi_tool.get("outputSchema"),
                                    annotations=openapi_tool.get("annotations"),
                                    is_enabled=True,
                                    project_id=project_id,
                                )
                                
                                tool_repo.create(tool)
                                imported_count += 1
                            except Exception as e:
                                tool_name = openapi_tool.get("name", "unknown")
                                logger.error(f"Failed to create tool '{tool_name}' during toolkit creation: {str(e)}")
                                continue
                        
                        logger.info(f"Imported {imported_count} tools from OpenAPI spec for toolkit {created.id}")
                    else:
                        logger.info(f"No tools found in OpenAPI spec for toolkit {created.id}")
                except Exception as e:
                    logger.exception(f"Error importing tools from OpenAPI spec during toolkit creation: {str(e)}")
                    # Don't fail toolkit creation if tool import fails - toolkit is already created
                    # The user can manually import tools later
        
        # Get toolkit source for response
        toolkit_source = source_repo.get_by_id(created.toolkit_source_id, project_id)
        
        response = ToolkitResponse(
            id=created.id,
            created_at=created.created_at,
            updated_at=created.updated_at,
            name=created.name,
            toolkit_source_id=created.toolkit_source_id,
            toolkit_source=ToolkitSourceResponse.model_validate(toolkit_source.model_dump()),
        )
        
        return response
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error creating toolkit: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create toolkit: {str(e)}"
        )


@router.get(
    "/toolkits",
    response_model=list[ToolkitListResponse],
    status_code=status.HTTP_200_OK,
    summary="List all toolkits",
)
def list_toolkits(
    project_id: str = Depends(verify_project_id_path),
) -> list[ToolkitListResponse]:
    """List all toolkits for a project."""
    try:
        
        repo = ToolkitRepository()
        toolkits = repo.list_all(project_id=project_id)
        
        return [
            ToolkitListResponse.model_validate(t.model_dump()) for t in toolkits
        ]
    except Exception as e:
        logger.exception(f"Error listing toolkits: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list toolkits: {str(e)}"
        )


@router.get(
    "/toolkits/{toolkit_id}",
    response_model=ToolkitResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a toolkit",
)
def get_toolkit(
    toolkit_id: str,
    project_id: str = Depends(verify_project_id_path),
) -> ToolkitResponse:
    """
    Get a toolkit by ID.
    
    Returns toolkit with toolkit source information.
    """
    try:
        
        toolkit_repo = ToolkitRepository()
        source_repo = ToolkitSourceRepository()
        
        toolkit = toolkit_repo.get_by_id(toolkit_id, project_id)
        
        # Get toolkit source for response
        toolkit_source = source_repo.get_by_id(toolkit.toolkit_source_id, project_id)
        
        response = ToolkitResponse(
            id=toolkit.id,
            created_at=toolkit.created_at,
            updated_at=toolkit.updated_at,
            name=toolkit.name,
            toolkit_source_id=toolkit.toolkit_source_id,
            toolkit_source=ToolkitSourceResponse.model_validate(toolkit_source.model_dump()),
        )
        
        return response
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except Exception as e:
        logger.exception(f"Error getting toolkit: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get toolkit: {str(e)}"
        )


@router.patch(
    "/toolkits/{toolkit_id}",
    response_model=ToolkitResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a toolkit",
)
def update_toolkit(
    toolkit_id: str,
    toolkit_data: ToolkitUpdate,
    project_id: str = Depends(verify_project_id_path),
) -> ToolkitResponse:
    """
    Update a toolkit.
    
    Only name and description can be updated.
    """
    try:
        
        toolkit_repo = ToolkitRepository()
        source_repo = ToolkitSourceRepository()
        
        # Prepare update data (only include provided fields)
        update_data = {}
        if toolkit_data.name is not None:
            update_data["name"] = toolkit_data.name
        if toolkit_data.description is not None:
            update_data["description"] = toolkit_data.description
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        # Verify toolkit exists and belongs to project
        toolkit_repo.get_by_id(toolkit_id, project_id)
        
        updated = toolkit_repo.update(toolkit_id, update_data, project_id)
        
        # Get toolkit source for response
        toolkit_source = source_repo.get_by_id(updated.toolkit_source_id, project_id)
        
        response = ToolkitResponse(
            id=updated.id,
            created_at=updated.created_at,
            updated_at=updated.updated_at,
            name=updated.name,
            toolkit_source_id=updated.toolkit_source_id,
            toolkit_source=ToolkitSourceResponse.model_validate(toolkit_source.model_dump()),
        )
        
        return response
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error updating toolkit: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update toolkit: {str(e)}"
        )


@router.delete(
    "/toolkits/{toolkit_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a toolkit",
)
def delete_toolkit(
    toolkit_id: str,
    project_id: str = Depends(verify_project_id_path),
) -> None:
    """
    Delete a toolkit.
    
    Cannot delete if there are tools in this toolkit.
    """
    try:
        
        repo = ToolkitRepository()
        repo.get_by_id(toolkit_id, project_id)
        
        deleted = repo.delete(toolkit_id, project_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Toolkit with ID '{toolkit_id}' not found"
            )
        
        return None
    except HTTPException:
        raise
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except Exception as e:
        logger.exception(f"Error deleting toolkit: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete toolkit: {str(e)}"
        )


@router.get(
    "/toolkits/{toolkit_id}/tools",
    response_model=list[ToolListResponse],
    status_code=status.HTTP_200_OK,
    summary="List all tools in a toolkit",
)
def list_tools_in_toolkit(
    toolkit_id: str,
    project_id: str = Depends(verify_project_id_path),
) -> list[ToolListResponse]:
    """List all tools in a toolkit."""
    try:
        
        toolkit_repo = ToolkitRepository()
        tool_repo = McpToolRepository()
        
        # Verify toolkit exists and belongs to project
        toolkit_repo.get_by_id(toolkit_id, project_id)
        
        tools = tool_repo.list_by_toolkit(toolkit_id, project_id)
        
        result = []
        for t in tools:
            tool_dict = t.model_dump()
            # Compute hasOutputSchema: check if outputSchema exists and is not empty
            output_schema = tool_dict.get("outputSchema")
            has_output_schema = (
                output_schema is not None 
                and (isinstance(output_schema, dict) and len(output_schema) > 0)
            )
            tool_dict["hasOutputSchema"] = has_output_schema
            result.append(ToolListResponse.model_validate(tool_dict))
        
        return result
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except Exception as e:
        logger.exception(f"Error listing tools in toolkit: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list tools: {str(e)}"
        )



@router.post(
    "/tools",
    response_model=ToolResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a tool",
)
def create_tool(
    tool_data: ToolCreateRequest,
    project_id: str = Depends(verify_project_id_path),
) -> ToolResponse:
    """Create a new tool."""
    try:
        
        toolkit_repo = ToolkitRepository()
        tool_repo = McpToolRepository()
        
        # Verify toolkit exists and belongs to project
        toolkit_repo.get_by_id(tool_data.toolkit_id, project_id)
        
        # Generate ID
        tool_id = _generate_id()
        
        # Create tool model
        tool = Tool(
            id=tool_id,
            toolkit_id=tool_data.toolkit_id,
            name=tool_data.name,
            title=tool_data.title,
            description=tool_data.description,
            inputSchema=tool_data.inputSchema,
            outputSchema=tool_data.outputSchema,
            annotations=tool_data.annotations,
            is_enabled=True,  # Default to enabled
            project_id=project_id,
        )
        
        created = tool_repo.create(tool)
        
        return ToolResponse.model_validate(created.model_dump())
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error creating tool: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create tool: {str(e)}"
        )


@router.get(
    "/tools",
    response_model=list[ToolListResponse],
    status_code=status.HTTP_200_OK,
    summary="List all tools",
)
def list_tools(
    project_id: str = Depends(verify_project_id_path),
) -> list[ToolListResponse]:
    """List all tools for a project."""
    try:
        
        repo = McpToolRepository()
        tools = repo.list_all(project_id=project_id)
        
        result = []
        for t in tools:
            tool_dict = t.model_dump()
            output_schema = tool_dict.get("outputSchema")
            has_output_schema = (
                output_schema is not None 
                and (isinstance(output_schema, dict) and len(output_schema) > 0)
            )
            tool_dict["hasOutputSchema"] = has_output_schema
            result.append(ToolListResponse.model_validate(tool_dict))
        
        return result
    except Exception as e:
        logger.exception(f"Error listing tools: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list tools: {str(e)}"
        )


@router.get(
    "/tools/{tool_id}",
    response_model=ToolResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a tool",
)
def get_tool(
    tool_id: str,
    project_id: str = Depends(verify_project_id_path),
) -> ToolResponse:
    """Get a tool by ID."""
    try:
        
        repo = McpToolRepository()
        tool = repo.get_by_id(tool_id, project_id)
        
        return ToolResponse.model_validate(tool.model_dump())
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except Exception as e:
        logger.exception(f"Error getting tool: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get tool: {str(e)}"
        )


@router.patch(
    "/tools/{tool_id}",
    response_model=ToolResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a tool",
)
def update_tool(
    tool_id: str,
    tool_data: ToolUpdateRequest,
    project_id: str = Depends(verify_project_id_path),
) -> ToolResponse:
    """
    Update a tool.
    
    Only name, title, description, inputSchema, outputSchema, and annotations can be updated.
    """
    try:
        
        repo = McpToolRepository()
        
        # Verify tool exists and belongs to project
        repo.get_by_id(tool_id, project_id)
        
        # Prepare update data (only include provided fields)
        update_data = {}
        if tool_data.name is not None:
            update_data["name"] = tool_data.name
        if tool_data.title is not None:
            update_data["title"] = tool_data.title
        if tool_data.description is not None:
            update_data["description"] = tool_data.description
        if tool_data.inputSchema is not None:
            update_data["inputSchema"] = tool_data.inputSchema
        if tool_data.outputSchema is not None:
            update_data["outputSchema"] = tool_data.outputSchema
        if tool_data.annotations is not None:
            update_data["annotations"] = tool_data.annotations
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        updated = repo.update(tool_id, update_data, project_id=project_id)
        
        return ToolResponse.model_validate(updated.model_dump())
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error updating tool: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update tool: {str(e)}"
        )


@router.delete(
    "/tools/{tool_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a tool",
)
def delete_tool(
    tool_id: str,
    project_id: str = Depends(verify_project_id_path),
) -> None:
    """Delete a tool."""
    try:
        
        repo = McpToolRepository()
        
        # Verify it exists and belongs to project
        repo.get_by_id(tool_id, project_id)
        
        # Delete
        deleted = repo.delete(tool_id, project_id=project_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tool with ID '{tool_id}' not found"
            )
        
        return None
    except HTTPException:
        raise
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except Exception as e:
        logger.exception(f"Error deleting tool: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete tool: {str(e)}"
        )


@router.post(
    "/tools/{tool_id}/enable",
    response_model=ToolResponse,
    status_code=status.HTTP_200_OK,
    summary="Enable a tool",
)
def enable_tool(
    tool_id: str,
    project_id: str = Depends(verify_project_id_path),
) -> ToolResponse:
    """Enable a tool."""
    try:
        
        repo = McpToolRepository()
        
        # Verify tool exists and belongs to project
        repo.get_by_id(tool_id, project_id)
        
        updated = repo.update_enabled_status(tool_id, is_enabled=True, project_id=project_id)
        
        return ToolResponse.model_validate(updated.model_dump())
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except Exception as e:
        logger.exception(f"Error enabling tool: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enable tool: {str(e)}"
        )


@router.post(
    "/tools/{tool_id}/disable",
    response_model=ToolResponse,
    status_code=status.HTTP_200_OK,
    summary="Disable a tool",
)
def disable_tool(
    tool_id: str,
    project_id: str = Depends(verify_project_id_path),
) -> ToolResponse:
    """Disable a tool."""
    try:
        
        repo = McpToolRepository()
        
        # Verify tool exists and belongs to project
        repo.get_by_id(tool_id, project_id=project_id)
        
        updated = repo.update_enabled_status(tool_id, is_enabled=False, project_id=project_id)
        
        return ToolResponse.model_validate(updated.model_dump())
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except Exception as e:
        logger.exception(f"Error disabling tool: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disable tool: {str(e)}"
        )


@router.post(
    "/tools/{tool_id}/infer-output-schema",
    response_model=InferOutputSchemaResponse,
    status_code=status.HTTP_200_OK,
    summary="Infer output schema from tool execution output",
)
def infer_tool_output_schema(
    tool_id: str,
    request: InferOutputSchemaRequest,
    project_id: str = Depends(verify_project_id_path),
) -> InferOutputSchemaResponse:
    """
    Infer output schema from tool output using LLM.
    """
    # Check if LLM keys are configured
    require_llm_keys()
    
    try:
        tool_repo = McpToolRepository()
        
        # Get tool for name and description
        tool = tool_repo.get_by_id(tool_id, project_id)
        
        # Use LLM to infer schema from the provided tool output
        inferred_schema = infer_output_schema(
            tool_name=tool.name,
            tool_description=tool.description or "",
            tool_output=request.tool_output,
        )
        
        return InferOutputSchemaResponse(
            inferred_schema=inferred_schema,
            tool_output=request.tool_output,
        )
        
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error inferring output schema: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to infer output schema: {str(e)}"
        )


@router.post(
    "/toolkits/{toolkit_id}/import-tools",
    response_model=list[ToolResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Import tools into a toolkit",
)
def import_tools_into_toolkit(
    toolkit_id: str,
    tools: list[ToolImportRequest],
    project_id: str = Depends(verify_project_id_path),
) -> list[ToolResponse]:
    """
    Import tools into a toolkit.
    
    This endpoint accepts a list of tool definitions and creates them in the specified toolkit.
    """
    try:
        toolkit_repo = ToolkitRepository()
        tool_repo = McpToolRepository()

        toolkit_repo.get_by_id(toolkit_id, project_id)
        
        created_tools = []
        for tool_data in tools:
            try:
                tool_id = _generate_id()
                tool = Tool(
                    id=tool_id,
                    toolkit_id=toolkit_id,
                    name=tool_data.name,
                    title=tool_data.title,
                    description=tool_data.description or "",
                    inputSchema=tool_data.inputSchema,
                    outputSchema=tool_data.outputSchema,
                    annotations=tool_data.annotations,
                    is_enabled=True,
                    project_id=project_id,
                )
                created = tool_repo.create(tool)
                created_tools.append(ToolResponse.model_validate(created.model_dump()))
            except Exception as e:
                tool_name = tool_data.name or "unknown"
                logger.error(f"Failed to create tool '{tool_name}' during import: {str(e)}")
                continue

        logger.info(f"Imported {len(created_tools)} tools into toolkit {toolkit_id}")
        return created_tools        
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error importing tools: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import tools: {str(e)}"
        )

def validate_openapi_spec(config: OpenApiSpecConfiguration) -> None:
    """
    Validate that an OpenAPI spec is valid JSON or YAML.
    
    Args:
        config: OpenAPI spec configuration
        
    Raises:
        HTTPException: If the spec is invalid or cannot be parsed
    """
    spec_text = config.openapi_spec.strip()
    
    if not spec_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OpenAPI spec is empty"
        )
    
    try:
        # Try parsing as JSON first
        try:
            json.loads(spec_text)
            logger.debug("OpenAPI spec is valid JSON")
            return
        except json.JSONDecodeError:
            pass
        
        # Try parsing as YAML
        try:
            yaml.safe_load(spec_text)
            logger.debug("OpenAPI spec is valid YAML")
            return
        except yaml.YAMLError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"OpenAPI spec is not valid JSON or YAML. YAML error: {str(e)}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse OpenAPI spec: {str(e)}"
        )


def extract_tools_from_openapi_spec(config: OpenApiSpecConfiguration) -> list[dict[str, Any]]:
    """
    Extract tools from an OpenAPI specification.
    
    Converts OpenAPI paths and operations into tool definitions.
    
    Args:
        config: OpenAPI spec configuration
        
    Returns:
        List of tool definitions extracted from the OpenAPI spec
        
    Raises:
        HTTPException: If the spec cannot be parsed or is invalid
    """
    spec_text = config.openapi_spec.strip()
    endpoint = config.endpoint.rstrip('/')
    
    # Parse the spec (try JSON first, then YAML)
    spec_data = None
    try:
        spec_data = json.loads(spec_text)
    except json.JSONDecodeError:
        try:
            spec_data = yaml.safe_load(spec_text)
        except yaml.YAMLError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to parse OpenAPI spec as JSON or YAML: {str(e)}"
            )
    
    if not isinstance(spec_data, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OpenAPI spec must be a JSON object"
        )
    
    # Validate it's an OpenAPI spec
    openapi_version = spec_data.get("openapi") or spec_data.get("swagger")
    if not openapi_version:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OpenAPI spec: missing 'openapi' or 'swagger' field"
        )
    
    tools = []
    paths = spec_data.get("paths", {})
    components = spec_data.get("components", {})
    schemas = components.get("schemas", {}) if components else {}
    
    def resolve_ref(ref_path: str) -> dict:
        """Resolve a $ref reference to the actual schema."""
        if ref_path.startswith("#/components/schemas/"):
            schema_name = ref_path.split("/")[-1]
            resolved = schemas.get(schema_name, {})
            if resolved:
                return resolved
        return {}
    
    def resolve_schema(schema: dict) -> dict:
        """Recursively resolve $ref references in a schema."""
        if not isinstance(schema, dict):
            return schema
        
        # If this schema has a $ref, resolve it
        if "$ref" in schema:
            ref_path = schema["$ref"]
            resolved = resolve_ref(ref_path)
            # Recursively resolve any nested refs
            if resolved:
                return resolve_schema(resolved)
            # If resolution failed, return original schema
            return schema
        
        # Recursively resolve refs in nested objects
        resolved_schema = {}
        for key, value in schema.items():
            if key == "properties" and isinstance(value, dict):
                resolved_schema[key] = {
                    prop_name: resolve_schema(prop_schema)
                    for prop_name, prop_schema in value.items()
                }
            elif key == "items" and isinstance(value, dict):
                resolved_schema[key] = resolve_schema(value)
            elif key == "anyOf" and isinstance(value, list):
                resolved_schema[key] = [resolve_schema(item) for item in value if isinstance(item, dict)]
            else:
                resolved_schema[key] = value
        
        return resolved_schema
    
    if not paths:
        logger.warning("OpenAPI spec has no paths defined")
        return tools
    
    # Iterate through all paths and operations
    for path, path_item in paths.items():
        if not isinstance(path_item, dict):
            continue
        
        # Get all HTTP methods (get, post, put, delete, patch, etc.)
        for method, operation in path_item.items():
            if method.lower() not in ["get", "post", "put", "delete", "patch", "head", "options", "trace"]:
                continue
            
            if not isinstance(operation, dict):
                continue
            
            # Extract operation details
            operation_id = operation.get("operationId") or f"{method.upper()}_{path.replace('/', '_').replace('{', '').replace('}', '').strip('_')}"
            summary = operation.get("summary", "")
            description = operation.get("description", "") or summary
            tags = operation.get("tags", [])
            
            # Build tool name (sanitize operationId or generate from path/method)
            tool_name = operation_id.lower().replace(" ", "_").replace("-", "_")
            if not tool_name or tool_name.startswith("_"):
                tool_name = f"{method.lower()}_{path.replace('/', '_').replace('{', '').replace('}', '').strip('_')}"
            
            # Extract parameters
            parameters = operation.get("parameters", [])
            request_body = operation.get("requestBody", {})
            
            # Build input schema from parameters and request body
            properties = {}
            required = []
            
            # Add path parameters
            for param in parameters:
                if param.get("in") == "path":
                    param_name = param.get("name", "")
                    if param_name:
                        param_schema = param.get("schema", {})
                        properties[param_name] = {
                            "type": param_schema.get("type", "string"),
                            "description": param.get("description", ""),
                        }
                        if param.get("required", False):
                            required.append(param_name)
            
            # Add query parameters
            for param in parameters:
                if param.get("in") == "query":
                    param_name = param.get("name", "")
                    if param_name:
                        param_schema = param.get("schema", {})
                        properties[param_name] = {
                            "type": param_schema.get("type", "string"),
                            "description": param.get("description", ""),
                        }
                        if param.get("required", False):
                            required.append(param_name)
            
            # Add request body parameters
            if request_body:
                content = request_body.get("content", {})
                # Try to get JSON schema from request body
                json_content = content.get("application/json", {}) or content.get("application/json; charset=utf-8", {})
                if json_content:
                    body_schema = json_content.get("schema", {})
                    # Resolve $ref references
                    body_schema = resolve_schema(body_schema)
                    
                    if body_schema.get("type") == "object":
                        body_properties = body_schema.get("properties", {})
                        properties.update(body_properties)
                        body_required = body_schema.get("required", [])
                        required.extend(body_required)
                    elif body_schema:
                        # If body is not an object, add it as a single property
                        properties["body"] = {
                            "description": request_body.get("description", "Request body"),
                            "schema": body_schema,
                        }
                        if request_body.get("required", False):
                            required.append("body")
            
            # Build input schema
            input_schema = {
                "type": "object",
                "properties": properties,
            }
            if required:
                input_schema["required"] = list(set(required))  # Remove duplicates
            
            # Extract response schema (use first 2xx response)
            output_schema = None
            responses = operation.get("responses", {})
            for status_code, response in responses.items():
                if isinstance(status_code, str) and status_code.startswith("2"):
                    content = response.get("content", {})
                    json_content = content.get("application/json", {}) or content.get("application/json; charset=utf-8", {})
                    if json_content:
                        output_schema = json_content.get("schema", {})
                        # Resolve $ref references in output schema
                        if output_schema:
                            output_schema = resolve_schema(output_schema)
                        break
            
            # Build tool title
            tool_title = summary or f"{method.upper()} {path}"
            if tags:
                tool_title = f"[{tags[0]}] {tool_title}"
            
            # Build annotations with endpoint information
            annotations = {
                "endpoint": endpoint,
                "path": path,
                "method": method.upper(),
            }
            if tags:
                annotations["tags"] = tags
            
            tool = {
                "name": tool_name,
                "title": tool_title,
                "description": description or f"{method.upper()} {path}",
                "inputSchema": input_schema,
                "outputSchema": output_schema,
                "annotations": annotations,
            }
            
            tools.append(tool)
    
    logger.info(f"Extracted {len(tools)} tools from OpenAPI spec")
    return tools