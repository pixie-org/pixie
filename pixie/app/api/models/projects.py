"""Project-related Pydantic schemas."""
from datetime import datetime

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    """Schema for creating a project."""
    name: str = Field(..., description="Name of the project", min_length=1)
    description: str | None = Field(default=None, description="Description of the project")


class ProjectUpdate(BaseModel):
    """Schema for updating a project."""
    name: str | None = Field(default=None, description="Name of the project", min_length=1)
    description: str | None = Field(default=None, description="Description of the project")


class ProjectResponse(BaseModel):
    """Schema for project response."""
    id: str = Field(..., description="Unique identifier for the project")
    created_at: datetime | None = Field(default=None, description="The timestamp when the project was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the project was last updated")
    name: str = Field(..., description="Name of the project")
    description: str | None = Field(default=None, description="Description of the project")
    owner_id: str = Field(..., description="User ID of the project owner")


class ProjectListResponse(BaseModel):
    """Schema for project list response."""
    projects: list[ProjectResponse] = Field(..., description="List of projects")

