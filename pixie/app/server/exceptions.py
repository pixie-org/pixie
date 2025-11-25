"""Custom exceptions for the application."""
from fastapi import HTTPException, status


class BaseAPIException(HTTPException):
    """Base exception for API errors."""

    def __init__(
        self,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail: str | None = None,
    ) -> None:
        super().__init__(status_code=status_code, detail=detail)


class NotFoundError(BaseAPIException):
    """Resource not found exception."""

    def __init__(self, detail: str = "Resource not found") -> None:
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ValidationError(BaseAPIException):
    """Validation error exception."""

    def __init__(self, detail: str = "Validation error") -> None:
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)

