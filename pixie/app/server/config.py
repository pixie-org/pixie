"""Application configuration using Pydantic Settings."""
import os

from functools import lru_cache
from pathlib import Path
from typing import List

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        # env_file is handled manually in _load_env_files() to support .env.local priority
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = Field(default="Pixie", description="Application name")
    debug: bool = Field(default=False, description="Debug mode")
    version: str = Field(default="0.1.0", description="API version")
    log_level: str = Field(
        default="INFO",
        description="Logging level: DEBUG, INFO, WARNING, ERROR, CRITICAL"
    )

    # Server
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    reload: bool = Field(default=False, description="Enable auto-reload")

    # CORS
    cors_origins: List[str] = Field(
        default=["http://localhost:5173", "http://localhost:8080"],
        description="Allowed CORS origins (specific origins)",
    )
    cors_allow_all_localhost: bool = Field(
        default=True,
        description="Allow all localhost origins (any port) - useful for development",
    )
    cors_allow_credentials: bool = Field(
        default=True, description="Allow credentials in CORS"
    )
    cors_allow_methods: List[str] = Field(
        default=["*"], description="Allowed HTTP methods"
    )
    cors_allow_headers: List[str] = Field(
        default=["*"], description="Allowed HTTP headers"
    )

    # LLM Configuration
    llm_provider: str = Field(
        default="openai",
        description="LLM provider to use: 'openai', 'claude', or 'gemini'"
    )
    openai_api_key: str | None = Field(
        default=None,
        description="OpenAI API key"
    )
    openai_model: str = Field(
        default="gpt-4o",
        description="OpenAI model to use (e.g., gpt-4o, gpt-4o-mini, gpt-4.1)"
    )
    anthropic_api_key: str | None = Field(
        default=None,
        description="Anthropic (Claude) API key"
    )
    claude_model: str = Field(
        default="claude-haiku-4-5-20251001",
        description="Claude model to use. Available models: claude-3-5-sonnet-20240620, claude-3-opus-20240229, claude-3-sonnet-20240229, claude-3-haiku-20240307, claude-3-5-haiku-20241022"
    )
    gemini_api_key: str | None = Field(
        default=None,
        description="Gemini API key"
    )
    gemini_model: str = Field(
        default="gemini-flash-latest",
        description="Gemini model to use (e.g., gemini-3-pro-preview, gemini-flash-latest)"
    )
    llm_ui_max_tokens: int = Field(
        default=16000,
        description="Maximum tokens for UI generation (increase if HTML is getting truncated)"
    )

    # Deployment Monitoring
    deployment_monitor_enabled: bool = Field(
        default=True,
        description="Enable background monitoring of Fly.io deployments"
    )
    deployment_monitor_interval: int = Field(
        default=30,
        description="Interval in seconds between deployment status checks"
    )
    deployment_monitor_timeout: int = Field(
        default=10,
        description="HTTP timeout in seconds for checking deployment status"
    )

    # OAuth Configuration
    oauth_secret_key: str = Field(
        default="change-me-in-production",
        description="Secret key for JWT token signing (use a strong random string in production)"
    )
    oauth_algorithm: str = Field(
        default="HS256",
        description="JWT algorithm to use"
    )
    oauth_token_expire_minutes: int = Field(
        default=60 * 24 * 7,  # 7 days
        description="JWT token expiration time in minutes"
    )
    oauth_refresh_token_expire_days: int = Field(
        default=30,  # 30 days
        description="Refresh token expiration time in days"
    )
    oauth_refresh_token_pepper: str = Field(
        default="change-me-refresh-pepper",
        description="Server-side secret pepper applied when hashing refresh tokens",
    )
    
    # Google OAuth
    google_client_id: str | None = Field(
        default=None,
        description="Google OAuth client ID"
    )
    google_client_secret: str | None = Field(
        default=None,
        description="Google OAuth client secret"
    )
    
    # GitHub OAuth
    github_client_id: str | None = Field(
        default=None,
        description="GitHub OAuth client ID"
    )
    github_client_secret: str | None = Field(
        default=None,
        description="GitHub OAuth client secret"
    )
    
    # Frontend URL for OAuth redirects
    frontend_url: str = Field(
        default="http://localhost:8080",
        description="Frontend URL for OAuth redirects"
    )
    
    # Guest mode - allows users to use the app without authentication
    guest_mode_enabled: bool = Field(
        default=False,
        description="Enable guest mode (no authentication required)"
    )


def load_env_files() -> None:
    """Load environment files in priority order based on MODE.
    
    If MODE=production:
        - Load .env first (base config)
        - Load env.production (overrides .env)
    
    Otherwise (development):
        - Load .env first (base config)
        - Load .env.local (overrides .env, if exists)
    
    Environment files are loaded from the project root directory (parent of pixie/).
    """
    # Get the root directory (parent of pixie directory)
    # __file__ is at pixie/app/server/config.py
    # .parent.parent.parent.parent = root directory
    root_dir = Path(__file__).parent.parent.parent.parent
    
    env_file = root_dir / ".env"
    mode = os.getenv("MODE", "").lower()
    
    # Load .env first (base config)
    if env_file.exists():
        load_dotenv(dotenv_path=env_file, override=False)
    
    # Load environment-specific file based on MODE
    if mode == "production":
        env_production = root_dir / ".env.production"
        if env_production.exists():
            load_dotenv(dotenv_path=env_production, override=True)
        else:
            import warnings
            warnings.warn(
                f"MODE=production but env.production not found at {env_production}. "
                "Using .env only. Create env.production for production configuration.",
                UserWarning
            )
    else:
        env_local = root_dir / ".env.local"
        if env_local.exists():
            load_dotenv(dotenv_path=env_local, override=True)


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    # Load environment files before creating Settings
    load_env_files()
    return Settings()
