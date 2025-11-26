"""Database model for refresh tokens."""
from datetime import datetime

from pydantic import BaseModel, Field


class RefreshToken(BaseModel):
    """Refresh token model stored server-side."""

    id: str = Field(..., description="Unique identifier for the refresh token record")
    user_id: str = Field(..., description="ID of the user that owns this refresh token")
    token_id: str = Field(..., description="Public identifier embedded in the refresh token")
    token_hash: str = Field(..., description="Hashed refresh token secret")
    salt: str = Field(..., description="Per token salt used for hashing")
    expires_at: datetime = Field(..., description="When the refresh token expires")
    created_at: datetime | None = Field(default=None, description="Creation timestamp")

