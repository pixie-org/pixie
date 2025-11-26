"""Authentication utilities for JWT token generation and validation."""
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from jose import JWTError, jwt

from app.server.config import get_settings

settings = get_settings()


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.oauth_token_expire_minutes
        )
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode, settings.oauth_secret_key, algorithm=settings.oauth_algorithm
    )
    return encoded_jwt


def _hash_refresh_token(secret: str, salt: str) -> str:
    """Hash refresh token using HMAC with pepper as key.
    
    Uses HMAC-SHA256 for secure keyed hashing. The pepper acts as the HMAC key,
    providing defense-in-depth even if the database is compromised.
    """
    # Use salt + secret as the message, pepper as the HMAC key
    message = f"{salt}{secret}".encode("utf-8")
    key = settings.oauth_refresh_token_pepper.encode("utf-8")
    return hmac.new(key, message, hashlib.sha256).hexdigest()


def create_refresh_token() -> tuple[str, str, str, str]:
    """Create a refresh token value and return token string plus metadata.

    Returns:
        tuple: (refresh_token, token_id, token_hash, salt)
    """
    token_id = secrets.token_hex(8)
    token_secret = secrets.token_urlsafe(32)
    salt = secrets.token_hex(16)
    token_hash = _hash_refresh_token(token_secret, salt)
    refresh_token = f"{token_id}.{token_secret}"
    return refresh_token, token_id, token_hash, salt


def verify_refresh_token(token_secret: str, salt: str, expected_hash: str) -> bool:
    """Verify a refresh token secret against stored hash."""
    computed = _hash_refresh_token(token_secret, salt)
    return hmac.compare_digest(computed, expected_hash)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(
            token, settings.oauth_secret_key, algorithms=[settings.oauth_algorithm]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

