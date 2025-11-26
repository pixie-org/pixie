"""Utilities for verifying project access and managing default projects."""
import secrets
from logging import getLogger
from urllib.parse import parse_qs, urlparse

from fastapi import Depends, HTTPException, Query, WebSocket, status

from app.db.models.projects import Project
from app.db.storage.project_repository import ProjectRepository
from app.server.auth_middleware import GUEST_USER_ID, get_current_user_id
from app.server.config import get_settings
from app.server.exceptions import NotFoundError

logger = getLogger(__name__)


def _generate_id() -> str:
    """Generate a random hexadecimal ID."""
    return secrets.token_hex(4)


def ensure_default_project(user_id: str) -> Project:
    """
    Ensure a default project exists for a user.
    
    If the user has no projects, creates a default project named "Default Project".
    Returns the default project (either existing or newly created).
    """
    repo = ProjectRepository()
    
    # Check if user already has projects
    existing_projects = repo.list_by_user(user_id)
    
    if existing_projects:
        # User already has projects, return the first one (oldest)
        return existing_projects[0]
    
    # User has no projects, create default project
    try:
        project_id = _generate_id()
        default_project = Project(
            id=project_id,
            name="Default Project",
            description="Your default project workspace",
            owner_id=user_id,
        )
        
        created = repo.create(default_project)
        logger.info(f"Created default project '{created.id}' for user '{user_id}'")
        return created
    except Exception as e:
        logger.error(f"Failed to create default project for user '{user_id}': {e}")
        raise


def verify_project_access(project_id: str, user_id: str) -> None:
    """
    Verify that a user has access to a project.
    
    Raises HTTPException if user doesn't have access or project doesn't exist.
    """
    repo = ProjectRepository()
    
    # Check if project exists
    try:
        repo.get_by_id(project_id)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found"
        )
    
    # Check if user has access
    if not repo.user_has_access(project_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User does not have access to project '{project_id}'"
        )


def get_verified_project_id(
    project_id: str = Query(..., description="Project ID"),
    user_id: str = Depends(get_current_user_id),
) -> str:
    """
    FastAPI dependency that verifies project access and returns the project_id.
    
    This dependency automatically verifies that:
    1. The project exists
    2. The authenticated user has access to the project
    
    Raises HTTPException if verification fails.
    Returns the verified project_id if successful.
    
    Use this for query parameters.
    """
    verify_project_access(project_id, user_id)
    return project_id


def verify_project_id_path(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
) -> str:
    """
    FastAPI dependency that verifies project access for path parameters.
    
    This dependency automatically verifies that:
    1. The project exists
    2. The authenticated user has access to the project
    
    Raises HTTPException if verification fails.
    Returns the verified project_id if successful.
    
    Use this for path parameters (e.g., /projects/{project_id}).
    """
    verify_project_access(project_id, user_id)
    return project_id


def verify_project_access_for_websocket(websocket: WebSocket, project_id: str) -> str:
    """
    Verify project access for WebSocket connections.

    This mirrors the HTTP auth behaviour:
    - In guest mode, uses the guest user ID
    - Otherwise, reads the Authorization header from the WebSocket handshake,
      decodes the JWT, and verifies that the user has access to the project.

    Raises HTTPException if verification fails.
    Returns the verified user_id on success.
    """
    settings = get_settings()

    # Determine user_id
    if settings.guest_mode_enabled:
        user_id = GUEST_USER_ID
    else:
        token: str | None = None

        # 1) Prefer Authorization header from WebSocket handshake (e.g. from non-browser clients)
        auth_header = websocket.headers.get("authorization") or websocket.headers.get("Authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1].strip()

        # 2) Fallback: check `token` query parameter on the WebSocket URL
        #    This is how browser clients pass JWTs, since they cannot set custom headers.
        if token is None:
            try:
                parsed = urlparse(str(websocket.url))
                query_params = parse_qs(parsed.query)
                token_param = query_params.get("token", [None])[0]
                if token_param:
                    token = token_param
            except Exception:
                # If URL parsing fails, we'll treat it as missing token below
                token = None

        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated. Please provide a valid token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            # Import here to avoid circular imports
            from app.server.auth import decode_access_token

            payload = decode_access_token(token)
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: missing subject",
                )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )

    # Verify project access using the resolved user_id
    verify_project_access(project_id, user_id)
    return user_id

