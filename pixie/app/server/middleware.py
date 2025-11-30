"""FastAPI middleware configuration."""
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.server.config import get_settings

settings = get_settings()

# Public paths that don't require authentication
PUBLIC_PATHS = [
    "/api/v1/public/health",
    "/api/v1/public/config",
    "/api/v1/public/auth/login/",
    "/api/v1/public/auth/callback/",
    "/api/v1/public/auth/refresh",
]

def is_public_path(path: str) -> bool:
    """Check if a path is public (doesn't require authentication)."""
    # Skip authentication for static files and frontend routes
    # Static files are served from root paths (not /api/)
    if not path.startswith("/api/"):
        return True
    
    # Check exact matches and paths that start with public paths
    for public_path in PUBLIC_PATHS:
        if path == public_path or path.startswith(public_path):
            return True
    return False


class AuthenticationMiddleware(BaseHTTPMiddleware):
    """Middleware to verify authentication on all protected routes."""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next):
        # Skip authentication for public paths
        if is_public_path(request.url.path):
            return await call_next(request)
        
        # Handle guest mode
        if settings.guest_mode_enabled:
            from app.db.models.users import User as UserModel
            from app.db.storage.user_repository import UserRepository
            from app.server.auth_middleware import GUEST_USER_ID

            # Get or create guest user and set in request state
            user_repo = UserRepository()
            try:
                guest_user = user_repo.get_by_id(GUEST_USER_ID)
            except Exception:
                # Guest user doesn't exist yet, create it
                guest_user = UserModel(
                    id=GUEST_USER_ID,
                    email="guest@pixie.local",
                    name="Guest User",
                    avatar_url=None,
                    waitlisted=False,  # Guest users are not waitlisted
                )
                guest_user = user_repo.create_or_update(guest_user)
            
            # Set guest user in request state
            request.state.user_id = GUEST_USER_ID
            request.state.user = guest_user
            return await call_next(request)
        
        # Check for Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Not authenticated. Please provide a valid token."},
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Extract and verify token
        token = auth_header.split(" ")[1]
        
        try:
            # Import here to avoid circular imports
            from app.db.storage.user_repository import UserRepository
            from app.server.auth import decode_access_token

            # Decode and validate token
            payload = decode_access_token(token)
            user_id = payload.get("sub")
            
            if not user_id:
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Invalid token"},
                )
            
            # Verify user exists in database and store in request state
            user_repo = UserRepository()
            user = user_repo.get_by_id(user_id)
            
            # Allow waitlisted users to access /auth/me to see their status
            # but deny access to all other API endpoints
            if user.waitlisted and request.url.path != "/api/v1/public/auth/me":
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": "Your account is on the waitlist. Access will be granted soon."},
                )
            
            request.state.user_id = user_id
            request.state.user = user
            
            return await call_next(request)
            
        except HTTPException as e:
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": str(e.detail)},
            )
        except Exception:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid or expired token"},
            )


def setup_middleware(app: FastAPI) -> None:
    """Configure and add middleware to FastAPI app."""
    settings = get_settings()

    # Add authentication middleware first (before CORS)
    # Always add middleware - it handles both guest mode and normal authentication
    # In guest mode, it sets up the guest user in request.state
    # In normal mode, it validates JWT tokens
    app.add_middleware(AuthenticationMiddleware)

    # Configure CORS origins
    # Note: FastAPI's CORSMiddleware has a limitation: when allow_credentials=True,
    # we cannot use allow_origin_regex. We must use a specific list of origins.
    if settings.cors_allow_all_localhost:
        # Build a comprehensive list of common localhost ports plus the configured origins
        # Common ports for development: 5173, 8080, etc.
        common_ports = [5173, 8080]
        localhost_origins = [f"http://localhost:{port}" for port in common_ports]
        allow_origins = list(dict.fromkeys(localhost_origins + list(settings.cors_origins)))
    else:
        allow_origins = settings.cors_origins
    
    # Disable credentials if allowing many origins (CORS security requirement)
    allow_credentials = (
        settings.cors_allow_credentials 
        if not (settings.cors_allow_all_localhost and len(allow_origins) > 10)
        else False
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=allow_credentials,
        allow_methods=settings.cors_allow_methods,
        allow_headers=settings.cors_allow_headers,
    )

