"""Public API routes."""
from fastapi import APIRouter

from app.api.public import (
    chat,
    designs,
    health,
    mcp_chat,
    mcp_tool_call,
    tools,
    widgets,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router)
api_router.include_router(tools.router)
api_router.include_router(widgets.router)
api_router.include_router(chat.router)
api_router.include_router(mcp_chat.router)
api_router.include_router(mcp_tool_call.router)
api_router.include_router(designs.router)

