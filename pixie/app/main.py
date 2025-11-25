"""FastAPI application entry point."""
import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI

from app.api.public import api_router
from app.server.config import get_settings
from app.server.middleware import setup_middleware

settings = get_settings()


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
        debug=settings.debug
    )

    # Setup middleware
    setup_middleware(app)

    # Include routers
    app.include_router(api_router)

    return app


app = create_application()
