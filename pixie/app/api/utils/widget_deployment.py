import logging
import shutil
import tempfile
from pathlib import Path

from app.db.models.widgets import Widget, WidgetDeploymentTypeEnum
from app.db.storage.mcp_tool_repository import McpToolRepository
from app.db.storage.tool_widget_repository import ToolWidgetRepository
from app.db.storage.ui_widget_resource_repository import UiWidgetResourceRepository
from app.db.storage.widget_repository import WidgetRepository
from app.mcp.utils import generate_openai_server_files, generate_server_files
from deploy.enums import WidgetServerTypeEnum
from deploy.utils import (
    generate_mcp_tool_function_from_tool_id,
    generate_mcp_tool_function_from_widget_id,
)

logger = logging.getLogger(__name__)


def generate_tool_functions(widget: Widget, server_type: WidgetServerTypeEnum) -> list[str]:
    """
    Generate tool functions for a widget.
    Args:
        widget: The widget to generate tool functions for
    Returns:
        A list of tool functions
    """
    tool_functions = []
    tool_repo = McpToolRepository()
    tool_widget_repo = ToolWidgetRepository()
    tool_widgets = tool_widget_repo.get_by_widget_id(widget.id)
    for tool_widget in tool_widgets:
        tool_id = tool_widget.tool_id
        tool = tool_repo.get_by_id(tool_id)
        print(tool)
        if not tool:
            raise ValueError(f"Tool with ID {tool_id} not found")

        tool_functions.append(generate_mcp_tool_function_from_tool_id(tool_id, server_type=server_type))
    
    tool_functions.append(generate_mcp_tool_function_from_widget_id(widget.id, server_type=server_type))
    return tool_functions


def generate_all_requirements(widget: Widget, server_type: WidgetServerTypeEnum) -> list[str]:
    """
    Generate all requirements for a widget.
    """
    return [
        "mcp>=1.19.0",
        "mcp-ui-server>=0.1.0",
        "fastmcp>=0.1.0",
        "websockets==15.0.1",
        "uvicorn>=0.24.0",
        "websockets>=12.0",
        "asyncio"
    ]

def create_deployment(widget_id: str, server_type: WidgetServerTypeEnum = WidgetServerTypeEnum.OPENAI) -> tuple[Path, WidgetDeploymentTypeEnum]:
    """
    Create a widget deployment bundle by generating server files and packaging them as a zip archive.
    
    Args:
        widget_id: The widget ID to package
    
    Returns:
        Tuple of (archive_path, working_directory, deployment_type)
    """
    widget_repo = WidgetRepository()
    widget = widget_repo.get_by_id(widget_id)
    if not widget:
        raise ValueError(f"Widget with ID {widget_id} not found")

    tool_functions = generate_tool_functions(widget, server_type=server_type)
    all_requirements = generate_all_requirements(widget, server_type=server_type)

    # Generate server files
    server_name = f"{widget_id}-server"
    output_dir = Path(tempfile.mkdtemp(prefix="mcp-server-"))
    pixie_sdk_import = """
from dataclasses import dataclass

import requests

import asyncio
from contextlib import asynccontextmanager

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client


class MCPClient:
    def __init__(self, url: str, max_retries: int = 3, retry_delay: float = 2.0, timeout: float = 30.0):
        self.url = url
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.timeout = timeout
        self.session = None
 
    @asynccontextmanager
    async def connect_streamable_http(self):
        last_error = None
        url = self.url
        for attempt in range(self.max_retries):
            try:
                print(f"🔌 Connection attempt {attempt + 1}/{self.max_retries} to {url}")
                
                async with streamablehttp_client(url, timeout=self.timeout) as client_data:
                    read, write, *_ = client_data
                    async with ClientSession(read, write) as session:
                        print("   ✓ Streamable HTTP client connected")
                        await session.initialize()
                        print("   ✅ Session initialized successfully!")
                        self.session = session
                        
                        try:
                            yield session
                        finally:
                            self.session = None
                            print("   ✓ Session closed")
                        
                        return            
            except Exception as e:
                last_error = e

            if attempt < self.max_retries - 1:
                wait_time = self.retry_delay * (2 ** attempt)
                print(f"   ⏳ Waiting {wait_time:.1f}s before retry...")
                await asyncio.sleep(wait_time)
            else:
                print(f"❌ All {self.max_retries} connection attempts failed")
                if last_error:
                    raise last_error

    async def call_tool(self, tool_name: str, arguments: dict = None):
        if not self.session:
            raise RuntimeError("Not connected to server")
        
        if arguments is None:
            arguments = {}
        
        try:
            result = await self.session.call_tool(tool_name, arguments)
            return result
        except Exception as e:
            error_type = type(e).__name__
            print(f"⚠️  Error calling tool '{tool_name}': {error_type}: {e}")
            raise


class ApiClient:
    def call_api(self, endpoint: str, method: str = "GET", data: dict = None):
        response = requests.request(method, f"{self.base_url}/{endpoint}", json=data)
        return response.json()

"""
    if server_type == WidgetServerTypeEnum.OPENAI:
        generate_openai_server_files(server_name, tool_functions, all_requirements, output_dir, pixie_sdk_import)
    else:
        generate_server_files(server_name, tool_functions, all_requirements, output_dir, pixie_sdk_import)
    
    archive_base = output_dir / server_name
    archive_path_str = shutil.make_archive(str(archive_base), "zip", root_dir=output_dir)
    archive_path = Path(archive_path_str)
    logger.info(f"📦 Created deployment archive: {archive_path}")

    deployment_type = WidgetDeploymentTypeEnum.LOCAL
    return archive_path, deployment_type
