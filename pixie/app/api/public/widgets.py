"""Public API endpoints for Widget and UiWidgetResource CRUD operations."""
import secrets
from logging import getLogger

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse

from app.api.core.llm_chat import LlmChat
from app.api.models.widgets import (
    UiWidgetResourceCreate,
    UiWidgetResourceListResponse,
    UiWidgetResourceResponse,
    UiWidgetResourceUpdate,
    WidgetCreate,
    WidgetListItem,
    WidgetListResponse,
    WidgetResponse,
    WidgetSetResourceRequest,
    WidgetUpdate,
)
from app.api.utils.llm_check import require_llm_keys
from app.api.utils.widget_deployment import create_deployment
from app.db.models.widgets import UiWidgetResource, Widget
from app.db.storage.mcp_tool_repository import McpToolRepository
from app.db.storage.tool_widget_repository import ToolWidgetRepository
from app.db.storage.ui_widget_resource_repository import UiWidgetResourceRepository
from app.db.storage.widget_chat_repository import WidgetChatRepository
from app.db.storage.widget_repository import WidgetRepository
from app.server.exceptions import NotFoundError
from app.server.project_access import verify_project_id_path

logger = getLogger(__name__)

router = APIRouter(prefix="/projects/{project_id}", tags=["widgets"])


def _generate_id() -> str:
    """Generate a random hexadecimal ID."""
    return secrets.token_hex(4)


@router.post(
    "/widgets",
    status_code=status.HTTP_200_OK,
    summary="Create a widget",
)
def create_widget(
    widget_data: WidgetCreate,
    project_id: str = Depends(verify_project_id_path),
) -> dict:
    """
    Create a new widget.
    
    Creates the widget, sets up tool associations, creates a conversation,
    processes the create_prompt as the first user message, generates a response,
    and sets the resulting UI resource on the widget.
    """
    # Check if LLM keys are configured
    require_llm_keys()
    
    try:
        widget_repo = WidgetRepository()
        tool_widget_repo = ToolWidgetRepository()
        chat_repo = WidgetChatRepository()
        tool_repo = McpToolRepository()
        resource_repo = UiWidgetResourceRepository()

        # Create widget
        widget_id = _generate_id()
        widget = Widget(
            id=widget_id,
            name=widget_data.name,
            description=widget_data.description,
            project_id=project_id,
        )
        created = widget_repo.create(widget)
        
        # Set tool associations
        if widget_data.tool_ids:
            tool_widget_repo.set_tools_for_widget(created.id, widget_data.tool_ids, project_id)
        
        # Create conversation for the widget
        conversation = chat_repo.get_or_create_conversation(widget_id=created.id, project_id=project_id)
        
        # Create the first user message with create_prompt
        chat_repo.create_message(
            conversation_id=conversation.id,
            role="user",
            content=widget_data.create_prompt,
            project_id=project_id,
        )
        
        # Get tools for the widget
        tool_widgets = tool_widget_repo.get_by_widget_id(created.id, project_id=project_id)
        tool_ids = [tw.tool_id for tw in tool_widgets]
        tools = [tool_repo.get_by_id(tool_id, project_id) for tool_id in tool_ids]
        
        # Generate response using LlmChat
        previous_messages = chat_repo.list_messages(conversation.id, project_id=project_id)
        llm_chat = LlmChat()
        response_text, ui_resource_dict = llm_chat.generate_response(
            widget_id=created.id,
            tools=tools,
            user_message=widget_data.create_prompt,
            previous_messages=previous_messages,
        )
        
        # Create UI resource if generated
        ui_resource_id = None
        if ui_resource_dict:
            created_resource = resource_repo.create(UiWidgetResource(
                id=_generate_id(),
                widget_id=created.id,
                widget_project_id=project_id,
                resource=ui_resource_dict,
                project_id=project_id,
            ))
            ui_resource_id = created_resource.id
        
        # Create assistant message
        chat_repo.create_message(
            conversation_id=conversation.id,
            role="assistant",
            content=response_text,
            project_id=project_id,
            ui_resource_id=ui_resource_id,
        )
        
        # Set ui_resource_id on the widget if one was created
        if ui_resource_id:
            update_data = {
                "ui_widget_resource_id": ui_resource_id,
            }
            widget_repo.update(created.id, update_data, project_id=project_id)
        
        return {"status": "ok"}
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error creating widget: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create widget: {str(e)}"
        )


@router.get(
    "/widgets",
    response_model=WidgetListResponse,
    status_code=status.HTTP_200_OK,
    summary="List widgets (paginated)",
)
def list_widgets(
    project_id: str = Depends(verify_project_id_path),
    limit: int = 20,
    offset: int = 0,
) -> WidgetListResponse:
    """
    List widgets with pagination.
    
    - **limit**: Number of items per page (default: 20, max: 100)
    - **offset**: Number of items to skip (default: 0)
    """
    try:
        # Validate limit
        if limit < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="limit must be greater than 0"
            )
        if limit > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="limit cannot exceed 100"
            )
        
        # Validate offset
        if offset < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="offset must be greater than or equal to 0"
            )
        
        widget_repo = WidgetRepository()
        tool_widget_repo = ToolWidgetRepository()
        
        # Get paginated widgets
        widgets = widget_repo.list_paginated(project_id, limit=limit, offset=offset)
        
        # Get total count
        total = widget_repo.count(project_id=project_id)
        
        # Build response items
        items = []
        for widget in widgets:
            tool_widgets = tool_widget_repo.get_by_widget_id(widget.id, project_id=project_id)
            tool_ids = [tw.tool_id for tw in tool_widgets]
            
            widget_data = widget.model_dump()
            widget_data["tool_ids"] = tool_ids
            items.append(WidgetListItem.model_validate(widget_data))
        
        # Calculate pagination metadata
        has_next = (offset + limit) < total
        has_prev = offset > 0
        
        return WidgetListResponse(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
            has_next=has_next,
            has_prev=has_prev,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error listing widgets: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list widgets: {str(e)}"
        )


@router.get(
    "/widgets/{widget_id}",
    response_model=WidgetResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a widget",
)
def get_widget(
    widget_id: str,
    project_id: str = Depends(verify_project_id_path),
) -> WidgetResponse:
    """Get a widget by ID."""
    try:
        widget_repo = WidgetRepository()
        tool_widget_repo = ToolWidgetRepository()
        
        widget = widget_repo.get_by_id(widget_id, project_id=project_id)
        tool_widgets = tool_widget_repo.get_by_widget_id(widget_id, project_id=project_id)
        tool_ids = [tw.tool_id for tw in tool_widgets]
        
        widget_data = widget.model_dump()
        widget_data["tool_ids"] = tool_ids
        
        return WidgetResponse.model_validate(widget_data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except Exception as e:
        logger.exception(f"Error getting widget: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get widget: {str(e)}"
        )


@router.patch(
    "/widgets/{widget_id}",
    response_model=WidgetResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a widget",
)
def update_widget(
    widget_id: str,
    widget_data: WidgetUpdate,
    project_id: str = Depends(verify_project_id_path),
) -> WidgetResponse:
    """
    Update a widget.
    
    If tool_ids are provided, updates the tool_widget relationships.
    """
    try:
        widget_repo = WidgetRepository()
        tool_widget_repo = ToolWidgetRepository()
        resource_repo = UiWidgetResourceRepository()
        
        # Verify widget exists and belongs to project
        widget_repo.get_by_id(widget_id, project_id=project_id)
        
        update_data = {}
        if widget_data.name is not None:
            update_data["name"] = widget_data.name
        if widget_data.description is not None:
            update_data["description"] = widget_data.description
        if not update_data and widget_data.tool_ids is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        if update_data:
            updated = widget_repo.update(widget_id, update_data, project_id=project_id)
        else:
            updated = widget_repo.get_by_id(widget_id, project_id=project_id)
        
        if widget_data.tool_ids is not None:
            tool_widget_repo.set_tools_for_widget(widget_id, widget_data.tool_ids, project_id)
        
        tool_widgets = tool_widget_repo.get_by_widget_id(widget_id, project_id=project_id)
        tool_ids = [tw.tool_id for tw in tool_widgets]
        
        response_data = updated.model_dump()
        response_data["tool_ids"] = tool_ids
        
        return WidgetResponse.model_validate(response_data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error updating widget: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update widget: {str(e)}"
        )


@router.delete(
    "/widgets/{widget_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a widget",
)
def delete_widget(
    widget_id: str,
    project_id: str = Depends(verify_project_id_path),
) -> None:
    """
    Delete a widget.
    """
    try:
        widget_repo = WidgetRepository()
        
        # Verify widget exists and belongs to project
        widget_repo.get_by_id(widget_id, project_id=project_id)
        
        # Proceed with deletion
        deleted = widget_repo.delete(widget_id, project_id=project_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Widget with ID '{widget_id}' not found"
            )
        
        return None
    except HTTPException:
        raise
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except Exception as e:
        logger.exception(f"Error deleting widget: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete widget: {str(e)}"
        )


@router.post(
    "/widgets/{widget_id}/set-resource",
    response_model=WidgetResponse,
    status_code=status.HTTP_200_OK,
    summary="Set UI widget resource ID for a widget",
)
def set_widget_resource(
    widget_id: str,
    resource_data: WidgetSetResourceRequest,
    project_id: str = Depends(verify_project_id_path),
) -> WidgetResponse:
    """
    Set the UI widget resource ID for a widget.
    
    This is a separate endpoint from PATCH to specifically handle setting the resource ID.
    """
    try:
        widget_repo = WidgetRepository()
        resource_repo = UiWidgetResourceRepository()
        tool_widget_repo = ToolWidgetRepository()
        
        # Verify widget exists and belongs to project
        widget_repo.get_by_id(widget_id, project_id=project_id)
        
        # Verify ui_widget_resource exists and belongs to project
        resource_repo.get_by_id(resource_data.ui_widget_resource_id, project_id=project_id)
        
        # Update widget with new ui_widget_resource_id
        update_data = {
            "ui_widget_resource_id": resource_data.ui_widget_resource_id,
            "ui_widget_resource_project_id": project_id,
        }
        updated = widget_repo.update(widget_id, update_data, project_id=project_id)
        
        # Fetch tool_ids for response
        tool_widgets = tool_widget_repo.get_by_widget_id(widget_id, project_id=project_id)
        tool_ids = [tw.tool_id for tw in tool_widgets]
        
        response_data = updated.model_dump()
        response_data["tool_ids"] = tool_ids
        
        return WidgetResponse.model_validate(response_data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error setting widget resource: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set widget resource: {str(e)}"
        )



@router.post(
    "/ui-widget-resources",
    response_model=UiWidgetResourceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a UI widget resource",
)
def create_ui_widget_resource(
    resource_data: UiWidgetResourceCreate,
    project_id: str = Depends(verify_project_id_path),
) -> UiWidgetResourceResponse:
    """
    Create a new UI widget resource.
    
    If creating would exceed 20 resources for the widget, deletes the oldest ones first.
    """
    try:
        repo = UiWidgetResourceRepository()
        widget_repo = WidgetRepository()
        
        # Verify widget exists and belongs to project
        widget = widget_repo.get_by_id(resource_data.widget_id, project_id=project_id)
        
        # Generate ID
        resource_id = _generate_id()
        
        # Create resource model
        resource = UiWidgetResource(
            id=resource_id,
            widget_id=resource_data.widget_id,
            resource=resource_data.resource,
            project_id=project_id,
        )
        
        created = repo.create(resource)
        
        return UiWidgetResourceResponse.model_validate(created.model_dump())
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error creating UI widget resource: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create UI widget resource: {str(e)}"
        )


@router.get(
    "/widgets/{widget_id}/ui-widget-resources",
    response_model=list[UiWidgetResourceListResponse],
    status_code=status.HTTP_200_OK,
    summary="List all UI widget resources for a widget",
)
def list_ui_widget_resources(
    widget_id: str,
    project_id: str = Depends(verify_project_id_path),
) -> list[UiWidgetResourceListResponse]:
    """List all UI widget resources for a widget."""
    try:
        widget_repo = WidgetRepository()
        resource_repo = UiWidgetResourceRepository()
        
        widget_repo.get_by_id(widget_id, project_id=project_id)
        resources = resource_repo.list_by_widget_id(widget_id, project_id=project_id)
        
        return [
            UiWidgetResourceListResponse.model_validate(r.model_dump()) for r in resources
        ]
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except Exception as e:
        logger.exception(f"Error listing UI widget resources: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list UI widget resources: {str(e)}"
        )


@router.get(
    "/widgets/{widget_id}/ui-widget-resources/latest",
    response_model=UiWidgetResourceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get the latest UI widget resource for a widget",
)
def get_latest_ui_widget_resource(
    widget_id: str,
    project_id: str = Depends(verify_project_id_path),
) -> UiWidgetResourceResponse:
    """Get the latest UI widget resource for a widget (most recent by created_at)."""
    try:
        widget_repo = WidgetRepository()
        resource_repo = UiWidgetResourceRepository()
        
        widget_repo.get_by_id(widget_id, project_id=project_id)
        latest_resource = resource_repo.get_latest_by_widget_id(widget_id, project_id=project_id)
        
        if not latest_resource:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No UI widget resources found for widget '{widget_id}'"
            )
        
        return UiWidgetResourceResponse.model_validate(latest_resource.model_dump())
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting latest UI widget resource: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get latest UI widget resource: {str(e)}"
        )


@router.get(
    "/ui-widget-resources/{resource_id}",
    response_model=UiWidgetResourceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a UI widget resource",
)
def get_ui_widget_resource(
    resource_id: str,
    project_id: str = Depends(verify_project_id_path),
) -> UiWidgetResourceResponse:
    """Get a UI widget resource by ID."""
    try:
        repo = UiWidgetResourceRepository()
        resource = repo.get_by_id(resource_id, project_id=project_id)
        
        return UiWidgetResourceResponse.model_validate(resource.model_dump())
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except Exception as e:
        logger.exception(f"Error getting UI widget resource: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get UI widget resource: {str(e)}"
        )


@router.patch(
    "/ui-widget-resources/{resource_id}",
    response_model=UiWidgetResourceResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a UI widget resource",
)
def update_ui_widget_resource(
    resource_id: str,
    resource_data: UiWidgetResourceUpdate,
    project_id: str = Depends(verify_project_id_path),
) -> UiWidgetResourceResponse:
    """
    Update a UI widget resource.
    
    Only resource can be updated.
    """
    try:
        repo = UiWidgetResourceRepository()
        
        # Verify resource exists and belongs to project
        repo.get_by_id(resource_id, project_id=project_id)
        
        update_data = {"resource": resource_data.resource}
        
        updated = repo.update(resource_id, update_data, project_id=project_id)
        
        return UiWidgetResourceResponse.model_validate(updated.model_dump())
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error updating UI widget resource: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update UI widget resource: {str(e)}"
        )


@router.delete(
    "/ui-widget-resources/{resource_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a UI widget resource",
)
def delete_ui_widget_resource(
    resource_id: str,
    project_id: str = Depends(verify_project_id_path),
) -> None:
    """Delete a UI widget resource."""
    try:
        repo = UiWidgetResourceRepository()
        repo.get_by_id(resource_id, project_id=project_id)
        
        deleted = repo.delete(resource_id, project_id=project_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"UI widget resource with ID '{resource_id}' not found"
            )
        
        return None
    except HTTPException:
        raise
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except Exception as e:
        logger.exception(f"Error deleting UI widget resource: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete UI widget resource: {str(e)}"
        )


# ============================================================================
# Widget Deployment Endpoints
# ============================================================================

@router.post(
    "/widgets/{widget_id}/deployments",
    status_code=status.HTTP_200_OK,
    summary="Generate a widget deployment bundle",
    response_class=FileResponse,
    responses={
        200: {
            "content": {"application/zip": {"schema": {"type": "string", "format": "binary"}}},
            "description": "Zip archive containing the generated MCP server bundle",
        }
    },
)
def create_widget_deployment(
    widget_id: str,
    project_id: str = Depends(verify_project_id_path),
) -> FileResponse:
    """
    Generate the MCP server bundle for a widget and return it as a downloadable zip file.
    """
    try:
        widget_repo = WidgetRepository()
        # Verify widget exists before generating files
        widget_repo.get_by_id(widget_id, project_id=project_id)
        
        archive_path = create_deployment(widget_id, project_id=project_id)
        
        headers = {
            "X-Widget-Id": widget_id,
        }
        
        return FileResponse(
            path=str(archive_path),
            filename=archive_path.name,
            media_type="application/zip",
            headers=headers,
        )
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error creating widget deployment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create widget deployment bundle: {str(e)}"
        )
