"""Widget-related Pydantic schemas."""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.db.models.widgets import WidgetDeploymentStatusEnum, WidgetDeploymentTypeEnum

# ============================================================================
# Widget Models
# ============================================================================

class WidgetCreate(BaseModel):
    """Schema for creating a widget."""
    name: str = Field(..., description="Unique name identifier for the widget", min_length=1)
    description: str | None = Field(default=None, description="Human-readable description of widget functionality")
    tool_ids: list[str] = Field(default=[], description="List of tool IDs to associate with this widget")
    create_prompt: str = Field(..., description="Initial prompt that becomes the first user message in the widget's conversation", min_length=1)


class WidgetUpdate(BaseModel):
    """Schema for updating a widget."""
    name: str | None = Field(default=None, description="Unique name identifier for the widget", min_length=1)
    description: str | None = Field(default=None, description="Human-readable description of widget functionality", min_length=1)
    tool_ids: list[str] | None = Field(default=None, description="List of tool IDs to associate with this widget")


class WidgetResponse(BaseModel):
    """Schema for widget response."""
    id: str = Field(..., description="Unique identifier for the widget")
    created_at: datetime | None = Field(default=None, description="The timestamp when the widget was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the widget was last updated")
    name: str = Field(..., description="Unique name identifier for the widget")
    description: str = Field(..., description="Human-readable description of widget functionality")
    ui_widget_resource_id: str | None = Field(default=None, description="UI widget resource ID that the widget belongs to")
    tool_ids: list[str] = Field(default=[], description="List of tool IDs to associate with this widget")


class WidgetListItem(BaseModel):
    """Schema for widget list item."""
    id: str = Field(..., description="Unique identifier for the widget")
    name: str = Field(..., description="Unique name identifier for the widget")
    description: str = Field(..., description="Human-readable description of widget functionality")
    created_at: datetime | None = Field(default=None, description="The timestamp when the widget was created")
    tool_ids: list[str] = Field(default=[], description="List of tool IDs associated with this widget")


class WidgetListResponse(BaseModel):
    """Schema for paginated widget list response."""
    items: list[WidgetListItem] = Field(..., description="List of widgets")
    total: int = Field(..., description="Total number of widgets")
    limit: int = Field(..., description="Number of items per page")
    offset: int = Field(..., description="Offset for pagination")
    has_next: bool = Field(..., description="Whether there are more items")
    has_prev: bool = Field(..., description="Whether there are previous items")


# ============================================================================
# UiWidgetResource Models
# ============================================================================

class WidgetSetResourceRequest(BaseModel):
    """Schema for setting UI widget resource ID on a widget."""
    ui_widget_resource_id: str = Field(..., description="UI widget resource ID to set on the widget")


class UiWidgetResourceCreate(BaseModel):
    """Schema for creating a UI widget resource."""
    widget_id: str = Field(..., description="Widget ID that the UI resource belongs to")
    resource: dict[str, Any] = Field(..., description="Resource object (JSON)")


class UiWidgetResourceUpdate(BaseModel):
    """Schema for updating a UI widget resource. Only resource can be updated."""
    resource: dict[str, Any] = Field(..., description="Resource object (JSON)")


class UiWidgetResourceResponse(BaseModel):
    """Schema for UI widget resource response."""
    id: str = Field(..., description="Unique identifier for the UI resource")
    widget_id: str = Field(..., description="Widget ID that the UI resource belongs to")
    created_at: datetime | None = Field(default=None, description="The timestamp when the UI resource was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the UI resource was last updated")
    resource: dict[str, Any] = Field(..., description="Resource object (JSON)")


class UiWidgetResourceListResponse(BaseModel):
    """Schema for UI widget resource list item."""
    id: str = Field(..., description="Unique identifier for the UI resource")
    widget_id: str = Field(..., description="Widget ID that the UI resource belongs to")
    created_at: datetime | None = Field(default=None, description="The timestamp when the UI resource was created")


# ============================================================================
# Widget Deployment Models
# ============================================================================

class WidgetDeploymentResponse(BaseModel):
    """Schema for widget deployment response."""
    id: str = Field(..., description="Unique identifier for the widget deployment")
    created_at: datetime | None = Field(default=None, description="The timestamp when the widget deployment was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the widget deployment was last updated")
    widget_id: str = Field(..., description="Widget ID that the widget deployment belongs to")
    deployment_type: WidgetDeploymentTypeEnum = Field(..., description="Type of deployment (e.g. 'local')")
    deployment_url: str = Field(..., description="URL of the deployment")
    deployment_status: WidgetDeploymentStatusEnum = Field(..., description="Status of the deployment")


class WidgetDeploymentListResponse(BaseModel):
    """Schema for widget deployment list item."""
    id: str = Field(..., description="Unique identifier for the widget deployment")
    widget_id: str = Field(..., description="Widget ID that the widget deployment belongs to")
    deployment_type: WidgetDeploymentTypeEnum = Field(..., description="Type of deployment")
    deployment_status: WidgetDeploymentStatusEnum = Field(..., description="Status of the deployment")
    created_at: datetime | None = Field(default=None, description="The timestamp when the widget deployment was created")
