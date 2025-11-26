"""API models for authentication endpoints."""
from pydantic import BaseModel, Field


class TokenResponse(BaseModel):
    """Response model for authentication token."""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    user: "UserResponse" = Field(..., description="User information")


class UserResponse(BaseModel):
    """Response model for user information."""
    id: str = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    name: str | None = Field(default=None, description="User name")
    avatar_url: str | None = Field(default=None, description="User avatar URL")
    waitlisted: bool = Field(..., description="Whether the user is on the waitlist")


class LoginUrlResponse(BaseModel):
    """Response model for OAuth login URL."""
    url: str = Field(..., description="OAuth authorization URL")


class TokenRefreshResponse(BaseModel):
    """Response model for token refresh."""
    access_token: str = Field(..., description="New JWT access token")
    refresh_token: str = Field(..., description="New refresh token")
    token_type: str = Field(default="bearer", description="Token type")

