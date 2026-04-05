"""
LLM Client abstraction with provider fallback and retry logic.

Supports Groq (primary) and OpenAI (fallback).
Wraps both behind a common interface with exponential backoff retries
and automatic failover when the primary provider is unavailable.
"""

import time
from abc import ABC, abstractmethod
from typing import Any

from .config import (
    GROQ_API_KEY, GROQ_MODEL,
    OPENAI_API_KEY, OPENAI_MODEL,
    FALLBACK_LLM_PROVIDER,
    LLM_RETRY_ATTEMPTS, LLM_RETRY_DELAY_S,
)
from .logger import get_logger

log = get_logger(__name__)


class LLMClient(ABC):
    """Abstract LLM client interface."""

    @abstractmethod
    def chat(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.1,
        max_tokens: int = 1024,
    ) -> str:
        """Send a chat completion request and return the response text."""
        ...

    @abstractmethod
    def provider_name(self) -> str:
        """Return a human-readable provider name."""
        ...


class GroqClient(LLMClient):
    """Groq API client."""

    def __init__(self, api_key: str = "", model: str = ""):
        from groq import Groq
        self._key = api_key or GROQ_API_KEY
        self._model = model or GROQ_MODEL
        if not self._key:
            raise EnvironmentError("GROQ_API_KEY is not set.")
        self._client = Groq(api_key=self._key)

    def chat(self, messages, temperature=0.1, max_tokens=1024) -> str:
        response = self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content.strip()

    def provider_name(self) -> str:
        return f"Groq/{self._model}"


class OpenAIClient(LLMClient):
    """OpenAI API client."""

    def __init__(self, api_key: str = "", model: str = ""):
        from openai import OpenAI
        self._key = api_key or OPENAI_API_KEY
        self._model = model or OPENAI_MODEL
        if not self._key:
            raise EnvironmentError("OPENAI_API_KEY is not set.")
        self._client = OpenAI(api_key=self._key)

    def chat(self, messages, temperature=0.1, max_tokens=1024) -> str:
        response = self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content.strip()

    def provider_name(self) -> str:
        return f"OpenAI/{self._model}"


class ResilientLLMClient(LLMClient):
    """
    Wraps a primary and optional fallback LLM client.

    On failure:
      1. Retries the primary provider up to LLM_RETRY_ATTEMPTS times
         with exponential backoff.
      2. If all retries fail and a fallback is available, switches to it.
    """

    def __init__(self, primary: LLMClient, fallback: LLMClient | None = None):
        self._primary = primary
        self._fallback = fallback
        self._active = primary

    def chat(self, messages, temperature=0.1, max_tokens=1024) -> str:
        last_error = None

        # Try primary with retries
        for attempt in range(1, LLM_RETRY_ATTEMPTS + 1):
            try:
                result = self._primary.chat(messages, temperature, max_tokens)
                if self._active is not self._primary:
                    log.info("Primary LLM recovered, switching back.")
                    self._active = self._primary
                return result
            except Exception as exc:
                last_error = exc
                log.warning(
                    f"Primary LLM ({self._primary.provider_name()}) "
                    f"attempt {attempt}/{LLM_RETRY_ATTEMPTS} failed: {exc}"
                )
                if attempt < LLM_RETRY_ATTEMPTS:
                    delay = LLM_RETRY_DELAY_S * (2 ** (attempt - 1))
                    time.sleep(delay)

        # Try fallback if available
        if self._fallback:
            log.warning(
                f"Primary LLM exhausted. Falling back to "
                f"{self._fallback.provider_name()}"
            )
            try:
                result = self._fallback.chat(messages, temperature, max_tokens)
                self._active = self._fallback
                return result
            except Exception as fb_exc:
                log.error(f"Fallback LLM also failed: {fb_exc}")
                raise fb_exc from last_error

        # No fallback, re-raise last error
        raise last_error  # type: ignore[misc]

    def provider_name(self) -> str:
        return self._active.provider_name()


def build_llm_client() -> LLMClient:
    """
    Factory: build the best available LLM client based on config.

    Returns a ResilientLLMClient wrapping the primary (Groq)
    and optional fallback (OpenAI) providers.
    """
    # Primary: Groq
    primary = GroqClient()

    # Fallback: OpenAI (if configured)
    fallback = None
    if FALLBACK_LLM_PROVIDER == "openai" and OPENAI_API_KEY:
        try:
            fallback = OpenAIClient()
            log.info(f"Fallback LLM configured: {fallback.provider_name()}")
        except Exception as exc:
            log.warning(f"Could not initialize fallback LLM: {exc}")

    return ResilientLLMClient(primary, fallback)
