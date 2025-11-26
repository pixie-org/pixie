"""Public API endpoints for OAuth authentication."""
import secrets
from datetime import datetime, timedelta, timezone

from authlib.integrations.httpx_client import AsyncOAuth2Client
from authlib.oauth2.rfc6749.errors import OAuth2Error
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse

from app.api.models.auth import LoginUrlResponse, TokenRefreshResponse, UserResponse
from app.db.models.users import User
from app.db.storage.refresh_token_repository import RefreshTokenRepository
from app.db.storage.user_repository import UserRepository
from app.server.auth import (
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
)
from app.server.auth_middleware import get_current_user
from app.server.config import get_settings

settings = get_settings()

router = APIRouter(prefix="", tags=["auth"])


def _generate_state() -> str:
    """Generate a random state for OAuth flow."""
    return secrets.token_urlsafe(32)


@router.get(
    "/auth/login/{provider}",
    response_model=LoginUrlResponse,
    summary="Get OAuth login URL",
)
async def login(provider: str, request: Request):
    """Get OAuth authorization URL for the specified provider."""
    client_id = None
    client_secret = None
    authorization_endpoint = None
    
    if provider == "google":
        client_id = settings.google_client_id
        client_secret = settings.google_client_secret
        authorization_endpoint = "https://accounts.google.com/o/oauth2/v2/auth"
    elif provider == "github":
        client_id = settings.github_client_id
        client_secret = settings.github_client_secret
        authorization_endpoint = "https://github.com/login/oauth/authorize"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider: {provider}. Supported providers: google, github"
        )
    
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"{provider.capitalize()} OAuth is not configured. Please set {provider.upper()}_CLIENT_ID and {provider.upper()}_CLIENT_SECRET environment variables."
        )
    
    # Generate state and store it (in production, use Redis or session storage)
    state = _generate_state()
    
    # Build redirect URI (backend endpoint)
    backend_url = str(request.base_url).rstrip('/')
    redirect_uri = f"{backend_url}/api/v1/public/auth/callback/{provider}"
    
    # Create OAuth client
    oauth = AsyncOAuth2Client(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=redirect_uri,
    )
    
    # Generate authorization URL
    if provider == "google":
        auth_url, _ = oauth.create_authorization_url(
            authorization_endpoint,
            state=state,
            scope="openid email profile",
        )
    else:  # github
        auth_url, _ = oauth.create_authorization_url(
            authorization_endpoint,
            state=state,
            scope="read:user user:email",
        )
    
    # For now, we'll include provider in the redirect URL
    return LoginUrlResponse(url=auth_url)


@router.get(
    "/auth/callback/{provider}",
    summary="OAuth callback endpoint",
)
async def callback(
    provider: str,
    code: str = Query(...),
    state: str = Query(None),
    request: Request = None,
):
    """Handle OAuth callback and create/update user."""
    client_id = None
    client_secret = None
    token_endpoint = None
    userinfo_endpoint = None
    
    if provider == "google":
        client_id = settings.google_client_id
        client_secret = settings.google_client_secret
        token_endpoint = "https://oauth2.googleapis.com/token"
        userinfo_endpoint = "https://www.googleapis.com/oauth2/v2/userinfo"
    elif provider == "github":
        client_id = settings.github_client_id
        client_secret = settings.github_client_secret
        token_endpoint = "https://github.com/login/oauth/access_token"
        userinfo_endpoint = "https://api.github.com/user"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider: {provider}"
        )
    
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"{provider.capitalize()} OAuth is not configured"
        )
    
    # Build redirect URI (backend endpoint)
    backend_url = str(request.base_url).rstrip('/')
    redirect_uri = f"{backend_url}/api/v1/public/auth/callback/{provider}"
    
    # Exchange code for token
    oauth = AsyncOAuth2Client(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=redirect_uri,
    )
    
    try:
        # GitHub requires Accept: application/json header to get JSON response
        # Google works with default headers
        headers = {}
        if provider == "github":
            headers = {"Accept": "application/json"}
        
        token_response = await oauth.fetch_token(
            token_endpoint, 
            code=code,
            headers=headers
        )
        access_token = token_response.get("access_token")
        
        if not access_token:
            error_detail = token_response.get("error_description") or token_response.get("error") or "Unknown error"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to obtain access token: {error_detail}"
            )
        
        # Get user info using httpx directly to avoid client reuse issues
        import httpx
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {access_token}"}
            resp = await client.get(userinfo_endpoint, headers=headers)
            resp.raise_for_status()
            user_info = resp.json()
        
        # Extract user data based on provider
        if provider == "google":
            email = user_info.get("email")
            name = user_info.get("name")
            avatar_url = user_info.get("picture")
        else:  # github
            email = user_info.get("email")
            # GitHub might not return email in user endpoint, need to fetch separately
            if not email:
                async with httpx.AsyncClient() as client:
                    headers = {"Authorization": f"Bearer {access_token}"}
                    email_resp = await client.get("https://api.github.com/user/emails", headers=headers)
                    email_resp.raise_for_status()
                    emails = email_resp.json()
                    email = next((e["email"] for e in emails if e.get("primary")), emails[0]["email"] if emails else None)
            name = user_info.get("name") or user_info.get("login")
            avatar_url = user_info.get("avatar_url")
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user email from OAuth provider"
            )
        
        # Create or update user (email is the primary identifier)
        user_repo = UserRepository()
        
        # Check if user already exists before creating
        existing_user = user_repo.get_by_email(email)
        is_new_user = existing_user is None
        
        user = User(
            id=secrets.token_hex(16),
            email=email,
            name=name,
            avatar_url=avatar_url,
            waitlisted=True,  # New users are waitlisted by default
        )
        
        user = user_repo.create_or_update(user)
        
        # Ensure default project exists only for newly created users
        if is_new_user:
            try:
                from app.server.project_access import ensure_default_project
                ensure_default_project(user.id)
            except Exception:
                # Log but don't fail authentication if project creation fails
                pass
        
        # Record login activity
        try:
            user_repo.record_login(user_id=user.id)
        except Exception:
            pass
        
        # Generate salted refresh token on each login (rotate existing records)
        refresh_token_value, token_id, token_hash, salt = create_refresh_token()
        refresh_token_expires_at = datetime.now(timezone.utc) + timedelta(
            days=settings.oauth_refresh_token_expire_days
        )
        
        refresh_repo = RefreshTokenRepository()
        refresh_repo.delete_by_user_id(user.id)
        refresh_repo.create(
            record_id=secrets.token_hex(16),
            user_id=user.id,
            token_id=token_id,
            token_hash=token_hash,
            salt=salt,
            expires_at=refresh_token_expires_at,
        )
        
        # Create JWT access token
        token_data = {"sub": user.id, "email": user.email}
        access_token = create_access_token(token_data)
        
        # Redirect to frontend with both tokens
        redirect_url = f"{settings.frontend_url}/auth/callback?token={access_token}&refresh_token={refresh_token_value}"
        return RedirectResponse(url=redirect_url, status_code=302)
        
    except OAuth2Error as e:
        # Handle OAuth2-specific errors (e.g., invalid code, expired code)
        error_msg = str(e.description) if hasattr(e, 'description') else str(e)
        redirect_url = f"{settings.frontend_url}/auth/error?message={error_msg}"
        return RedirectResponse(url=redirect_url)
    except HTTPException:
        # Re-raise HTTP exceptions to maintain proper status codes
        raise
    except Exception as e:
        error_msg = f"OAuth authentication failed: {str(e)}"
        redirect_url = f"{settings.frontend_url}/auth/error?message={error_msg}"
        return RedirectResponse(url=redirect_url)


@router.post(
    "/auth/refresh",
    response_model=TokenRefreshResponse,
    summary="Refresh access token",
)
async def refresh_token(refresh_token: str = Query(..., description="Refresh token")):
    """Exchange a refresh token for a new access token and refresh token."""
    refresh_repo = RefreshTokenRepository()
    user_repo = UserRepository()
    
    try:
        token_id, token_secret = refresh_token.split(".", 1)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    
    token_record = refresh_repo.get_by_token_id(token_id)
    
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    
    expires_at = token_record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        refresh_repo.delete_by_token_id(token_record.token_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
        )
    
    if not verify_refresh_token(token_secret, token_record.salt, token_record.token_hash):
        refresh_repo.delete_by_token_id(token_record.token_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    
    # Get user to issue new tokens
    user = user_repo.get_by_id(token_record.user_id)
    
    # Rotate refresh token
    refresh_repo.delete_by_token_id(token_record.token_id)
    new_refresh_token_value, new_token_id, new_token_hash, new_salt = create_refresh_token()
    new_refresh_token_expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.oauth_refresh_token_expire_days
    )
    refresh_repo.create(
        record_id=secrets.token_hex(16),
        user_id=user.id,
        token_id=new_token_id,
        token_hash=new_token_hash,
        salt=new_salt,
        expires_at=new_refresh_token_expires_at,
    )
    
    # Create new access token
    token_data = {"sub": user.id, "email": user.email}
    new_access_token = create_access_token(token_data)
    
    return TokenRefreshResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token_value,
        token_type="bearer",
    )


@router.get(
    "/auth/me",
    response_model=UserResponse,
    summary="Get current user",
)
async def get_current_user_info(
    user: User = Depends(get_current_user),
):
    """Get current authenticated user information."""
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        avatar_url=user.avatar_url,
        waitlisted=user.waitlisted,
    )

