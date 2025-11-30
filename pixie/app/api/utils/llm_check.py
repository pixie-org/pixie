"""Utility functions for checking LLM availability."""
from fastapi import HTTPException, status

from app.server.config import get_settings


def require_llm_keys() -> None:
    """
    Check if LLM API keys are configured.
    
    Raises:
        HTTPException: If no LLM API keys are configured
    """
    settings = get_settings()
    
    has_openai = bool(settings.openai_api_key)
    has_anthropic = bool(settings.anthropic_api_key)
    has_google = bool(settings.gemini_api_key)
    
    if not has_openai and not has_anthropic and not has_google:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "LLM functionality is unavailable. "
                "Please configure at least one of OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY"
                "in your environment variables. See the setup documentation for more information."
            )
        )

