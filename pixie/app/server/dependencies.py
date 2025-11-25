"""FastAPI dependencies."""
from app.core.config import Settings, get_settings


def get_settings_dependency() -> Settings:
    """
    Dependency to get settings.
    
    Note: This is a simple wrapper around get_settings() which is already cached.
    Use this function if you need settings as a FastAPI dependency injection.
    Otherwise, call get_settings() directly.
    """
    return get_settings()

