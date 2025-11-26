"""Health check endpoints."""
from fastapi import APIRouter

from app.server.config import get_settings

router = APIRouter(tags=["health"])
settings = get_settings()

@router.get("/health")
def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}

@router.get("/config")
def get_config() -> dict[str, bool]:
    """Get application configuration (public, no auth required)."""
    return {
        "guest_mode_enabled": settings.guest_mode_enabled
    }
