"""Database models/schemas for widget-related tables."""
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class Widget(BaseModel):
    """Widget model representing a UI widget."""
    id: str = Field(..., description="Unique identifier for the widget")
    created_at: datetime | None = Field(default=None, description="The timestamp when the widget was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the widget was last updated")
    name: str = Field(..., description="Unique name identifier for the widget")
    description: str | None = Field(default=None, description="Human-readable description of widget functionality")
    ui_widget_resource_id: str | None = Field(default=None, description="UI widget resource ID that the widget belongs to")
    project_id: str = Field(..., description="Project ID that the widget belongs to")


class ToolWidget(BaseModel):
    """Association model linking tools to widgets."""
    tool_id: str = Field(..., description="Tool ID")
    widget_id: str = Field(..., description="Widget ID")
    project_id: str = Field(..., description="Project ID that the tool widget belongs to")
    created_at: datetime | None = Field(default=None, description="The timestamp when the tool widget was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the tool widget was last updated")


class UiWidgetResource(BaseModel):
    """UI resource model containing resource data for widgets."""
    id: str = Field(..., description="Unique identifier for the UI resource")
    widget_id: str = Field(..., description="Widget ID that the UI resource belongs to")
    created_at: datetime | None = Field(default=None, description="The timestamp when the UI resource was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the UI resource was last updated")
    resource: dict[str, Any] = Field(..., description="Resource object (JSON)")
    project_id: str = Field(..., description="Project ID that the UI resource belongs to")


