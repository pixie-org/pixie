import logging
import shutil
import tempfile
from pathlib import Path

from deploy.enums import WidgetServerTypeEnum
from app.db.models.widgets import UiWidgetResource, Widget
from app.db.storage.mcp_tool_repository import McpToolRepository
from app.db.storage.tool_widget_repository import ToolWidgetRepository
from app.db.storage.ui_widget_resource_repository import UiWidgetResourceRepository
from app.db.storage.widget_repository import WidgetRepository
from app.mcp.utils import generate_server_files
from typing import Any
from app.db.models.tools import ToolSourceType, ToolkitSource
from app.db.models.tools import McpServerConfiguration
from app.db.storage.toolkit_repository import ToolkitRepository
from app.db.storage.toolkit_source_repository import ToolkitSourceRepository

logger = logging.getLogger(__name__)

def generate_widget_name_slug(widget: Widget) -> str:
    widget_name = widget.name.replace(" ", "-")
    widget_name = widget_name.replace("-", "_")
    return widget_name

def build_fastmcp_proxy_config(toolkit_sources: list[ToolkitSource]) -> dict[str, Any]:
    """
    Build FastMCP proxy configuration from toolkit sources.
    
    Args:
        toolkit_sources: List of toolkit sources (must be MCP server sources)
    
    Returns:
        Dictionary with mcpServers configuration for FastMCP proxy
    """
    mcp_servers = {}
    
    for source in toolkit_sources:
        if source.source_type != ToolSourceType.MCP_SERVER:
            continue
            
        config = source.configuration
        if not isinstance(config, McpServerConfiguration):
            continue
        
        # Generate a server key from source name (sanitize for use as key)
        server_key = source.name.lower().replace(" ", "_").replace("-", "_")
        # Ensure uniqueness by appending source ID if needed
        if server_key in mcp_servers:
            server_key = f"{server_key}_{source.id[:8]}"
        
        # Build server config
        server_config: dict[str, Any] = {
            "url": config.server_url,
            "transport": config.transport.value if hasattr(config.transport, 'value') else str(config.transport),
        }
        
        # Add auth configuration
        auth_config = config.auth_config
        if auth_config.type.value == "oauth2":
            server_config["auth"] = "oauth"
        elif auth_config.type.value == "bearer_token" and auth_config.bearer_token:
            # For bearer token, we might need to add headers
            # FastMCP proxy might handle this differently, but for now we'll add it as a note
            server_config["auth"] = "bearer"
            if config.custom_headers:
                server_config["headers"] = config.custom_headers
            else:
                server_config["headers"] = {}
            server_config["headers"]["Authorization"] = f"Bearer {auth_config.bearer_token}"
        
        # Add custom headers if present (and not already added for bearer token)
        if config.custom_headers and "headers" not in server_config:
            server_config["headers"] = config.custom_headers
        
        mcp_servers[server_key] = server_config
    
    return {"mcpServers": mcp_servers}

def get_widget_toolkit_sources(widget: Widget) -> list[ToolkitSource]:
    """
    Get all unique toolkit sources for a widget by following:
    widget -> tool_widget -> tool -> toolkit -> toolkit_source
    
    Args:
        widget: The widget to get toolkit sources for
    
    Returns:
        A list of unique toolkit sources (only MCP server sources)
    """
    tool_repo = McpToolRepository()
    tool_widget_repo = ToolWidgetRepository()
    toolkit_repo = ToolkitRepository()
    source_repo = ToolkitSourceRepository()

    tool_widgets = tool_widget_repo.get_by_widget_id(widget.id, project_id=widget.project_id)
    
    toolkit_ids = set()
    for tool_widget in tool_widgets:
        tool = tool_repo.get_by_id(tool_widget.tool_id, widget.project_id)
        if tool:
            toolkit_ids.add(tool.toolkit_id)
    
    # Get unique toolkit sources (only MCP server sources)
    sources = []
    source_ids_seen = set()
    
    for toolkit_id in toolkit_ids:
        toolkit = toolkit_repo.get_by_id(toolkit_id, widget.project_id)
        if toolkit.toolkit_source_id not in source_ids_seen:
            source = source_repo.get_by_id(toolkit.toolkit_source_id, widget.project_id)
            # Only include MCP server sources
            if source.source_type == ToolSourceType.MCP_SERVER:
                sources.append(source)
                source_ids_seen.add(toolkit.toolkit_source_id)
    
    return sources

def generate_mcp_server_configuration(widget: Widget) -> dict[str, Any] | None:
    """
    Generate MCP server configuration for a widget.
    Returns a config dict in the format:
    {
        "mcpServers": {
            "server_key": {
                "url": "...",
                "transport": "http",
                "auth": "oauth",  # or other auth config
            }
        }
    }

    Args:
        widget: The widget to generate MCP server configuration for

    Returns:
        A dictionary with mcpServers configuration for FastMCP proxy
    """
    # Get all toolkit sources for this widget
    toolkit_sources = get_widget_toolkit_sources(widget)
    if len(toolkit_sources) == 0:
        return None
    # Build FastMCP proxy configuration
    mcp_config = build_fastmcp_proxy_config(toolkit_sources)
    
    return mcp_config

def generate_all_requirements() -> list[str]:
    """
    Generate all requirements for a widget.
    """
    return [
        "mcp>=1.19.0",
        "fastmcp>=0.1.0",
        "uvicorn>=0.24.0",
    ]

def _inject_script_to_head(html_content: str, script: str) -> str:
    """Inject a script into the HTML head section as the last script tag.
    
    Args:
        html_content: The HTML content to modify
        script: The script content to inject (without <script> tags)
        
    Returns:
        HTML content with script injected
    """
    script_tag = f"    <script>\n{script}\n    </script>"
    
    # Find the head section
    if '</head>' in html_content:
        # Find the head section boundaries
        head_start = html_content.find('<head>')
        head_end_index = html_content.rfind('</head>')
        
        if head_start != -1:
            # Extract head section only
            head_section = html_content[head_start:head_end_index]
            
            # Find the last </script> tag in the head section (case-insensitive search)
            # Look for both </script> and </SCRIPT> patterns
            last_script_end = -1
            search_text = head_section.lower()
            script_end_patterns = ['</script>', '</SCRIPT>', '</Script>']
            
            for pattern in script_end_patterns:
                pattern_lower = pattern.lower()
                last_pos = search_text.rfind(pattern_lower)
                if last_pos != -1:
                    # Convert back to original case position
                    last_script_end = head_start + last_pos + len(pattern)
                    break
            
            if last_script_end != -1:
                # Insert after the last </script> tag
                insert_index = last_script_end
                return html_content[:insert_index] + '\n' + script_tag + '\n' + html_content[insert_index:]
            else:
                # No script tags found, insert before </head>
                return html_content[:head_end_index] + '\n' + script_tag + '\n' + html_content[head_end_index:]
    
    # Fallback cases
    if '<head>' in html_content:
        # Head tag exists but no closing tag (malformed HTML), try to insert after <head>
        head_start = html_content.find('<head>')
        insert_index = head_start + len('<head>')
        return html_content[:insert_index] + '\n' + script_tag + '\n' + html_content[insert_index:]
    elif '<html>' in html_content:
        # No head tag, add one with the script
        html_start = html_content.find('<html>')
        insert_index = html_start + len('<html>')
        return html_content[:insert_index] + '\n<head>\n' + script_tag + '\n</head>' + html_content[insert_index:]
    else:
        # No HTML structure, prepend with head and script
        return f'<head>\n{script_tag}\n</head>\n{html_content}'

def prepare_html_content_for_mcp(html_content: str, server_type: WidgetServerTypeEnum) -> str:
    if server_type == WidgetServerTypeEnum.OPENAI:
        # Script to inject for OpenAI compatibility
        script_injection = """
            // Alias window.pixie to window.openai
            // This ensures window.pixie.callTool() calls window.openai.callTool()
            // Wait for window.openai to be available (it's provided by the host environment)
            (function() {
                if (window.openai) {
                    window.pixie = window.openai;
                } else {
                    // If not ready yet, wait for DOMContentLoaded or use a small delay
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', function() {
                            if (window.openai) window.pixie = window.openai;
                        });
                    } else {
                        // DOM already loaded, try after a short delay
                        setTimeout(function() {
                            if (window.openai) window.pixie = window.openai;
                        }, 100);
                    }
                }
            })();
        """
        # Inject script into HTML head as last script tag
        html_content = _inject_script_to_head(html_content, script_injection.strip())

    return html_content


def generate_tool_functions(widget: Widget, server_type: WidgetServerTypeEnum) -> list[str]:
    """
    Generate tool functions for a widget.
    Args:
        widget: The widget to generate tool functions for
    Returns:
        A list of tool functions
    """
    widget_name = generate_widget_name_slug(widget)

    if server_type == WidgetServerTypeEnum.OPENAI:
        tool_meta = f"""
tool_meta = {{
    "openai/outputTemplate": f"ui://widget/{widget_name}.html",
    "openai/toolInvocation/invoking": f"Preparing your {widget_name}…",
    "openai/toolInvocation/invoked": f"{widget_name} ready.",
    "openai/widgetAccessible": True,
    "openai/resultCanProduceWidget": True,
    "annotations": {{
        "destructiveHint": False,
        "openWorldHint": False,
        "readOnlyHint": True,
    }}
}}
"""

    return [
f"""
{tool_meta}

@mcp.tool(name="{widget_name}", title="{widget.name}", description="{widget.description}", meta = tool_meta)
def {widget_name}_tool() -> dict:
    additional_tool_meta = {{}}
    return {{
        "content": [
            {{
                "type": "text",
                "text": "Tool Output."
            }}
        ],
        "structuredContent": {{
            "title": "Hello from Pixie 👋",
        }},
        "_meta": additional_tool_meta
    }}
"""
 ]


def generate_resource_functions(widget: Widget, server_type: WidgetServerTypeEnum) -> list[str]:
    widget_name = generate_widget_name_slug(widget)
    ui_widget_resource_repo = UiWidgetResourceRepository()
    ui_widget_resource: UiWidgetResource = ui_widget_resource_repo.get_by_id(widget.ui_widget_resource_id, widget.project_id)
    html_content = ui_widget_resource.resource['resource']['text']

    html_content = prepare_html_content_for_mcp(html_content, server_type)

    return [
f"""
ui_widget_meta = {{}}
@mcp.resource(name="{widget_name}", title="{widget.name}", description="{widget.description}", 
uri="ui://widget/{widget_name}.html", mime_type="text/html+skybridge", meta=ui_widget_meta)
def {widget_name}_resource() -> str:
    return \"\"\"{html_content}\"\"\"
"""
]

def create_deployment(widget_id: str, project_id: str, server_type: WidgetServerTypeEnum = WidgetServerTypeEnum.OPENAI) -> Path:
    """
    Create a widget deployment bundle by generating server files and packaging them as a zip archive.
    
    Args:
        widget_id: The widget ID to package
        project_id: The project ID that the widget belongs to (required for project-scoped access)
        server_type: The type of server to generate (default: OPENAI)
    
    Returns:
        Path to the created zip archive file
    
    Raises:
        ValueError: If widget is not found
    """
    widget_repo = WidgetRepository()
    widget = widget_repo.get_by_id(widget_id, project_id=project_id)
    widget_name = widget.name
    widget_name_slug = widget_name.replace(" ", "-")
    if not widget:
        raise ValueError(f"Widget with ID {widget_id} not found")

    tool_functions = generate_tool_functions(widget, server_type=server_type)
    all_requirements = generate_all_requirements()

    # Generate MCP server configuration
    mcp_config = generate_mcp_server_configuration(widget)
    
    if mcp_config is not None and len(mcp_config.get("mcpServers", {})) == 0:
        raise ValueError(f"No MCP server configurations found for widget {widget_id}")

    server_name = f"{widget_name_slug}-server"
    output_dir = Path(tempfile.mkdtemp(prefix="mcp-server-"))
    pixie_sdk_import = """
import requests

class ApiClient:
    def call_api(self, endpoint: str, method: str = "GET", data: dict = None):
        response = requests.request(method, f"{self.base_url}/{endpoint}", json=data)
        return response.json()
"""
    resource_functions = generate_resource_functions(widget, server_type)
    generate_server_files(server_name, tool_functions, resource_functions, mcp_config, all_requirements, output_dir, pixie_sdk_import)

    archive_base = output_dir / server_name
    archive_path_str = shutil.make_archive(str(archive_base), "zip", root_dir=output_dir)
    archive_path = Path(archive_path_str)
    logger.info(f"📦 Created deployment archive: {archive_path}")

    return archive_path
