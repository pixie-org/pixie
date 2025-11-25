"""Database models/schemas for design-related tables."""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class DesignTypeEnum(str, Enum):
    """Enum for design types."""
    LOGO = "logo"
    UX_DESIGN = "ux_design"


class Design(BaseModel):
    """Design model representing uploaded logo or UX design files."""
    id: str = Field(..., description="Unique identifier for the design")
    created_at: datetime | None = Field(default=None, description="The timestamp when the design was created")
    updated_at: datetime | None = Field(default=None, description="The timestamp when the design was last updated")
    design_type: DesignTypeEnum = Field(..., description="Type of design (logo or ux_design)")
    filename: str = Field(..., description="Original filename of the uploaded file")
    content_type: str = Field(..., description="MIME type of the file (e.g., image/png, image/jpeg)")
    file_data: bytes = Field(..., description="Binary file data")
    file_size: int = Field(..., description="Size of the file in bytes")

