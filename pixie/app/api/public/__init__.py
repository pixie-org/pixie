"""Public API routes."""
from fastapi import APIRouter

from app.api.public import (
    auth,
    chat,
    designs,
    health,
    mcp_chat,
    mcp_tool_call,
    projects,
    tools,
    widgets,
)

api_router = APIRouter(prefix="/api/v1")

public_router = APIRouter(prefix="/public")
public_router.include_router(health.router)
public_router.include_router(auth.router)
api_router.include_router(public_router)

api_router.include_router(projects.router)
api_router.include_router(tools.router)
api_router.include_router(widgets.router)
api_router.include_router(chat.router)
api_router.include_router(mcp_chat.router)
api_router.include_router(mcp_tool_call.router)
api_router.include_router(designs.router)

