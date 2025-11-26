"""Database models/schemas for project-related tables."""
from datetime import datetime

from pydantic import BaseModel, Field


class Project(BaseModel):
    """Project model representing a project workspace."""

    id: str = Field(..., description="Unique identifier for the project")
    created_at: datetime | None = Field(default=None, description="The timestamp when the project was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the project was last updated")
    name: str = Field(..., description="Name of the project")
    description: str | None = Field(default=None, description="Description of the project")
    owner_id: str = Field(..., description="User ID of the project owner")


class ProjectUser(BaseModel):
    """Association model linking users to projects (for access control)."""

    project_id: str = Field(..., description="Project ID")
    user_id: str = Field(..., description="User ID")
    created_at: datetime | None = Field(default=None, description="The timestamp when the project user was created")

