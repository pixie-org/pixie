"""FastAPI middleware configuration."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.server.config import get_settings


def setup_middleware(app: FastAPI) -> None:
    """Configure and add middleware to FastAPI app."""
    settings = get_settings()

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

