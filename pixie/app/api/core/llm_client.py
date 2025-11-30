"""LLM client module for unified LLM API calls."""
import logging
import os
from typing import Any

import litellm

from app.server.config import get_settings

logger = logging.getLogger(__name__)


class LLMClient:
    """
    Unified LLM client for making API calls to various LLM providers.
    
    This class handles:
    - Provider configuration and API key setup
    - Unified interface for LLM calls across providers (OpenAI, Anthropic, Gemini)
    - Response parsing and error handling
    """
    
    def __init__(self):
        """Initialize the LLM client with configured provider."""
        settings = get_settings()
        self.settings = settings
        self.model_name = self._configure_provider(settings)
    
    def _configure_provider(self, settings) -> str:
        """
        Configure litellm with API keys from settings and return model name.
        
        Args:
            settings: Application settings object
            
        Returns:
            Model name string for litellm (e.g., "gpt-4o", "anthropic/claude-3-5-sonnet-20240620")
            
        Raises:
            ValueError: If provider is unknown or model is not configured
        """
        if settings.llm_provider == "openai":
            os.environ["OPENAI_API_KEY"] = settings.openai_api_key
            if not settings.openai_model:
                raise ValueError(
                    "OpenAI model is not configured. "
                    "Please set OPENAI_MODEL in your environment variables."
                )
            return settings.openai_model
        elif settings.llm_provider == "claude":
            os.environ["ANTHROPIC_API_KEY"] = settings.anthropic_api_key
            if not settings.claude_model:
                raise ValueError(
                    "Claude model is not configured. "
                    "Please set CLAUDE_MODEL in your environment variables."
                )
            return f"anthropic/{settings.claude_model}"
        elif settings.llm_provider == "gemini":
            os.environ["GEMINI_API_KEY"] = settings.gemini_api_key
            if not settings.gemini_model:
                raise ValueError(
                    "Gemini model is not configured. "
                    "Please set GEMINI_MODEL in your environment variables."
                )
            return f"gemini/{settings.gemini_model}"
        else:
            raise ValueError(f"Unknown provider: {settings.llm_provider}")
    
    def call(
        self,
        messages: list[dict[str, Any]],
        system: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 1000,
    ) -> tuple[str, dict[str, Any]]:
        """
        Make an LLM API call using the configured provider.
        
        Args:
            messages: List of message dicts with "role" and "content" keys
            system: Optional system message (will be prepended to messages)
            temperature: Temperature for generation (default: 0.2)
            max_tokens: Maximum tokens to generate (default: 1000)
        
        Returns:
            Tuple of (response_text, usage_info)
            - response_text: The generated text response
            - usage_info: Dictionary with input_tokens, output_tokens, finish_reason
        
        Raises:
            Exception: If the LLM API call fails
        """
        try:
            litellm_messages = messages.copy()
            if system:
                if litellm_messages and litellm_messages[0].get("role") == "system":
                    litellm_messages[0] = {"role": "system", "content": system}
                else:
                    litellm_messages.insert(0, {"role": "system", "content": system})

            response = litellm.completion(
                model=self.model_name,
                messages=litellm_messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            response_text = response.choices[0].message.content or ""
            
            usage_info = {
                "input_tokens": getattr(response.usage, "prompt_tokens", 0) if hasattr(response, "usage") else 0,
                "output_tokens": getattr(response.usage, "completion_tokens", 0) if hasattr(response, "usage") else 0,
                "finish_reason": response.choices[0].finish_reason if response.choices else None,
            }

            logger.info(
                f"LLM response generated successfully - "
                f"Model: {self.model_name}, Tokens: {usage_info['input_tokens']} input + {usage_info['output_tokens']} output, "
                f"Response length: {len(response_text)} chars"
            )

            return response_text, usage_info
            
        except Exception as e:
            logger.error(f"litellm API error for model {self.model_name}: {e}", exc_info=True)
            raise

