"""Authentication middleware and dependencies for API routes."""
from fastapi import HTTPException, Request, status

from app.db.models.users import User
from app.db.storage.user_repository import UserRepository
from app.server.config import get_settings

settings = get_settings()

# Guest user constants
GUEST_USER_ID = "guest-user"
GUEST_TOKEN = "guest-token"


def get_current_user(request: Request) -> User:
    """
    Dependency to get current authenticated user from request state.
    
    The middleware has already verified the token and stored the user in request.state.
    This dependency simply retrieves it, avoiding duplicate token verification.
    """
    # User should always be set by middleware for protected routes
    if hasattr(request.state, "user") and request.state.user:
        return request.state.user
    
    # Fallback: fetch by user_id if only ID is available (shouldn't happen normally)
    if hasattr(request.state, "user_id") and request.state.user_id:
        user_repo = UserRepository()
        return user_repo.get_by_id(request.state.user_id)
    
    # If we get here, middleware didn't set user (shouldn't happen)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user_id(request: Request) -> str:
    """
    Dependency to get current authenticated user ID from request state.
    
    More lightweight than get_current_user if you only need the user ID.
    """
    # Check if user_id is in request state (set by middleware)
    if hasattr(request.state, "user_id") and request.state.user_id:
        return request.state.user_id
    
    # Guest mode fallback
    if settings.guest_mode_enabled:
        return GUEST_USER_ID
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_optional_user(request: Request) -> User | None:
    """
    Optional authentication dependency - returns user if authenticated, None otherwise.
    """
    try:
        return get_current_user(request)
    except HTTPException:
        return None

