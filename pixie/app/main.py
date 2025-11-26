"""FastAPI application entry point."""
import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI

from app.api.public import api_router
from app.server.auth_middleware import GUEST_USER_ID
from app.server.config import get_settings
from app.server.middleware import setup_middleware

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager for startup and shutdown tasks."""
    # Startup: Initialize guest user if guest mode is enabled
    if settings.guest_mode_enabled:
        try:
            from app.db.models.users import User
            from app.db.storage.user_repository import UserRepository
            from app.server.project_access import ensure_default_project
            
            user_repo = UserRepository()
            try:
                # Check if guest user exists
                user_repo.get_by_id(GUEST_USER_ID)
            except Exception:
                # Create guest user if it doesn't exist
                guest_user = User(
                    id=GUEST_USER_ID,
                    email="guest@pixie.local",
                    name="Guest User",
                    avatar_url=None,
                    waitlisted=False,  # Guest users are not waitlisted
                )
                user_repo.create_or_update(guest_user)
                logging.getLogger(__name__).info("Guest user initialized")
                try:
                    ensure_default_project(GUEST_USER_ID)
                    logging.getLogger(__name__).info("Default project ensured for guest user")
                except Exception as e:
                    logging.getLogger(__name__).warning(f"Failed to ensure default project for guest user: {e}")
        except Exception as e:
            logging.getLogger(__name__).warning(f"Failed to initialize guest user: {e}")
    
    yield
    
    # Shutdown tasks (if any)
    pass


def setup_logging() -> None:
    """Configure application logging."""
    # Get log level from settings
    log_level_str = settings.log_level.upper()
    log_level_map = {
        "DEBUG": logging.DEBUG,
        "INFO": logging.INFO,
        "WARNING": logging.WARNING,
        "ERROR": logging.ERROR,
        "CRITICAL": logging.CRITICAL,
    }
    log_level = log_level_map.get(log_level_str, logging.INFO)
    
    # If debug mode is enabled, force DEBUG level
    if settings.debug:
        log_level = logging.DEBUG
    
    # Create logs directory if it doesn't exist
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    
    # Create timestamped log file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = logs_dir / f"app_{timestamp}.log"
    
    # Define log format
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"
    
    # Create handlers
    handlers = []
    
    # File handler - write to timestamped log file
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(log_level)
    file_handler.setFormatter(logging.Formatter(log_format, date_format))
    handlers.append(file_handler)
    
    
    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format=log_format,
        datefmt=date_format,
        handlers=handlers,
        force=True,  # Override any existing configuration
    )
    
    # Set specific logger levels
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("app").setLevel(log_level)
    
    # Suppress noisy third-party loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    
    logger = logging.getLogger(__name__)
    logger.info(f"Logging configured at level: {logging.getLevelName(log_level)}")
    logger.info(f"Log file: {log_file.absolute()}")
    if settings.debug:
        logger.debug("Debug mode enabled - verbose logging active")


def create_application() -> FastAPI:
    """Create and configure FastAPI application."""
    # Setup logging first
    setup_logging()
    
    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        debug=settings.debug,
        lifespan=lifespan,
        docs_url=None,  # Disable /docs
        redoc_url=None,  # Disable /redoc
        openapi_url=None,  # Disable /openapi.json
    )

    # Setup middleware
    setup_middleware(app)

    # Include routers
    app.include_router(api_router)

    return app


app = create_application()
