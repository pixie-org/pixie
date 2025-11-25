"""Database models/schemas for widget-related tables."""
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class WidgetDeploymentTypeEnum(str, Enum):
    LOCAL = "local"

class WidgetDeploymentStatusEnum(str, Enum):
    ACTIVE = "active"
    DEPLOYING = "deploying"
    SUSPENDED = "suspended"
    ERROR = "error"
    DELETED = "deleted"

class Widget(BaseModel):
    """Widget model representing a UI widget."""
    id: str = Field(..., description="Unique identifier for the widget")
    created_at: datetime | None = Field(default=None, description="The timestamp when the widget was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the widget was last updated")
    name: str = Field(..., description="Unique name identifier for the widget")
    description: str | None = Field(default=None, description="Human-readable description of widget functionality")
    ui_widget_resource_id: str | None = Field(default=None, description="UI widget resource ID that the widget belongs to")


class ToolWidget(BaseModel):
    """Association model linking tools to widgets."""
    tool_id: str = Field(..., description="Tool ID")
    widget_id: str = Field(..., description="Widget ID")
    created_at: datetime | None = Field(default=None, description="The timestamp when the tool widget was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the tool widget was last updated")


class UiWidgetResource(BaseModel):
    """UI resource model containing resource data for widgets."""
    id: str = Field(..., description="Unique identifier for the UI resource")
    widget_id: str = Field(..., description="Widget ID that the UI resource belongs to")
    created_at: datetime | None = Field(default=None, description="The timestamp when the UI resource was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the UI resource was last updated")
    resource: dict[str, Any] = Field(..., description="Resource object (JSON)")


class WidgetDeployment(BaseModel):
    """Widget deployment model representing a deployment of a widget."""
    id: str = Field(..., description="Unique identifier for the widget deployment")
    created_at: datetime | None = Field(default=None, description="The timestamp when the widget deployment was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the widget deployment was last updated")
    widget_id: str = Field(..., description="Widget ID that the widget deployment belongs to")
    deployment_type: WidgetDeploymentTypeEnum = Field(..., description="Type of deployment (e.g. 'local', 'docker')")
    deployment_url: str = Field(..., description="URL of the deployment")
    deployment_status: WidgetDeploymentStatusEnum = Field(..., description="Status of the deployment (e.g. 'active', 'inactive', 'error')")
