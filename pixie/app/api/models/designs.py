"""Design-related Pydantic schemas."""
from datetime import datetime

from pydantic import BaseModel, Field

from app.db.models.designs import DesignTypeEnum


class DesignResponse(BaseModel):
    """Schema for design response."""
    id: str = Field(..., description="Unique identifier for the design")
    created_at: datetime | None = Field(default=None, description="The timestamp when the design was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the design was last updated")
    design_type: DesignTypeEnum = Field(..., description="Type of design (logo or ux_design)")
    filename: str = Field(..., description="Original filename of the uploaded file")
    content_type: str = Field(..., description="MIME type of the file")
    file_size: int = Field(..., description="Size of the file in bytes")


class DesignListResponse(BaseModel):
    """Schema for design list item."""
    id: str = Field(..., description="Unique identifier for the design")
    created_at: datetime | None = Field(default=None, description="The timestamp when the design was created")
    design_type: DesignTypeEnum = Field(..., description="Type of design (logo or ux_design)")
    filename: str = Field(..., description="Original filename of the uploaded file")
    content_type: str = Field(..., description="MIME type of the file")
    file_size: int = Field(..., description="Size of the file in bytes")


class DesignListPaginatedResponse(BaseModel):
    """Schema for paginated design list response."""
    items: list[DesignListResponse] = Field(..., description="List of designs")
    total: int = Field(..., description="Total number of designs")
    limit: int = Field(..., description="Number of items per page")
    offset: int = Field(..., description="Offset for pagination")
    has_next: bool = Field(..., description="Whether there are more items")
    has_prev: bool = Field(..., description="Whether there are previous items")

