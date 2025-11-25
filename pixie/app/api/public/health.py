"""Health check endpoints."""
from fastapi import APIRouter

router = APIRouter(tags=["health"])

@router.get("/health")
def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}
