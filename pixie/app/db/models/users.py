"""Database models/schemas for user authentication tables."""
from datetime import datetime

from pydantic import BaseModel, Field


class User(BaseModel):
    """User model representing authenticated users."""

    id: str = Field(..., description="Unique identifier for the user")
    created_at: datetime | None = Field(default=None, description="The timestamp when the user was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the user was last updated")
    email: str = Field(..., description="User's email address")
    name: str | None = Field(default=None, description="User's display name")
    avatar_url: str | None = Field(default=None, description="URL to user's avatar image")
    last_login_at: datetime | None = Field(default=None, description="The timestamp of the user's last login")
    last_activity_at: datetime | None = Field(default=None, description="The timestamp of the user's last activity")
    waitlisted: bool = Field(default=True, description="Whether the user is on the waitlist")

