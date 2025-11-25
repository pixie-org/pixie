import json
import re

from app.db.models.tools import (
    McpServerConfiguration,
    OpenApiSpecConfiguration,
    Tool,
    Toolkit,
    ToolkitSource,
)
from app.db.models.widgets import UiWidgetResource, Widget
from app.db.storage.mcp_tool_repository import McpToolRepository
from app.db.storage.toolkit_repository import ToolkitRepository
from app.db.storage.toolkit_source_repository import ToolkitSourceRepository
from app.db.storage.ui_widget_resource_repository import UiWidgetResourceRepository
from app.db.storage.widget_repository import WidgetRepository
from deploy.enums import WidgetServerTypeEnum


def _to_snake_case(name: str) -> str:
    return re.sub(r'[^a-zA-Z0-9]+', '_', name.lower()).strip('_')

def _map_json_type_to_python_type(json_type: str) -> str:
    """Map JSON schema type to Python type annotation."""
    type_mapping = {
        'string': 'str',
        'integer': 'int',
        'number': 'float',
        'boolean': 'bool',
        'array': 'list',
        'object': 'dict',
        'null': 'None',
    }
    return type_mapping.get(json_type.lower(), json_type)

def _parse_input_schema(input_schema: dict) -> list[tuple[str, str]]:
    """Parse input schema and return list of (param_name, param_type) tuples.
    
    Handles both simple dict format and OpenAPI-style schema format.
    """
    # Check if it's OpenAPI-style schema with 'properties'
    if 'properties' in input_schema:
        properties = input_schema.get('properties', {})
        params = []
        for param_name, param_schema in properties.items():
            # Extract type from schema
            if isinstance(param_schema, dict):
                json_type = param_schema.get('type', 'any')
                # Handle union types (list of types)
                if isinstance(json_type, list):
                    # Convert list of types to union type string
                    python_types = [_map_json_type_to_python_type(str(t)) for t in json_type]
                    param_type = ' | '.join(python_types) if python_types else 'any'
                else:
                    param_type = _map_json_type_to_python_type(str(json_type))
            else:
                param_type = _map_json_type_to_python_type(str(param_schema))
            params.append((param_name, param_type))
        return params
    else:
        # Simple dict format: {param: type}
        # Map types if they're JSON schema types
        params = []
        for param_name, param_type in input_schema.items():
            mapped_type = _map_json_type_to_python_type(str(param_type))
            params.append((param_name, mapped_type))
        return params

def generate_external_tool_id(tool: Tool) -> str:
    return '_'.join([_to_snake_case(tool.name), tool.toolkit_id, tool.id])

def get_details_from_external_tool_id(external_tool_id: str) -> tuple[str, str, str]:
    parts = external_tool_id.split('_')
    return '_'.join(parts[0:-2]), parts[-2], parts[-1]

def generate_external_widget_id(widget: Widget) -> str:
    return '_'.join([_to_snake_case(widget.name), widget.id])

def _serialize_output_schema(output_schema: dict | None) -> str:
    """Serialize output schema to JSON string, replacing null with the string "null"."""
    if output_schema:
        schema_json = json.dumps(output_schema)
        # Replace JSON null values with the string "null"
        # Match ": null" or ", null" or "[ null" to be more specific
        schema_json = re.sub(r':\s*null\b', ': "null"', schema_json)
        schema_json = re.sub(r',\s*null\b', ', "null"', schema_json)
        schema_json = re.sub(r'\[\s*null\b', '["null"', schema_json)
        return schema_json
    else:
        return 'None'

def generate_mcp_tool_function_from_tool_id(tool_id: str, server_type: WidgetServerTypeEnum) -> str:
    tool_repo = McpToolRepository()
    tool: Tool = tool_repo.get_by_id(tool_id)

    toolkit_repo = ToolkitRepository()
    toolkit: Toolkit = toolkit_repo.get_by_id(tool.toolkit_id)
    toolkit_source_repo = ToolkitSourceRepository()
    toolkit_source: ToolkitSource = toolkit_source_repo.get_by_id(toolkit.toolkit_source_id)
    tool_source = toolkit_source.configuration

    is_mcp_source = False
    if isinstance(tool_source, McpServerConfiguration):
        tool_source_url = tool_source.server_url
        is_mcp_source = True
    elif isinstance(tool_source, OpenApiSpecConfiguration):
        tool_source_url = tool_source.endpoint
    else:
        raise ValueError(f"Invalid tool source configuration: {type(tool_source)}")

    function_name = generate_external_tool_id(tool)
    parsed_params = _parse_input_schema(tool.inputSchema)
    tool_params_string = ", ".join([f"{param}: {param_type}" for param, param_type in parsed_params])
    tool_params_dict = "{" + ", ".join([f'"{param}": {param}' for param, _ in parsed_params]) + "}"
    tool_output_schema_string = _serialize_output_schema(tool.outputSchema)

    if server_type == WidgetServerTypeEnum.OPENAI:
        return f"""
    def call_tool_{function_name}({tool_params_string}):
        import asyncio
    
        async def _call_tool_async():
            mcp_client = MCPClient(url="{tool_source_url}")
            async with mcp_client.connect_streamable_http() as session:
                result = await session.call_tool("{tool.name}", {tool_params_dict})
                return result
        
        try:
            # Try to get the current event loop
            loop = asyncio.get_running_loop()
            # If we're in an async context, we need to run in a new thread
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, _call_tool_async())
                return future.result()
        except RuntimeError:
            # No event loop running, use asyncio.run (works for sync functions)
            return asyncio.run(_call_tool_async())

    _tool_{function_name} = {{ 
        "tool_name": "{function_name}",
        "title": "{function_name}",
        "input_schema": {tool.inputSchema},
        "output_schema": {tool_output_schema_string},
        "call_tool": call_tool_{function_name},
    }}

    widgets.append(_tool_{function_name})
    """

    if is_mcp_source:
        return f"""@mcp.tool(output_schema={tool_output_schema_string})
def {function_name}({tool_params_string}):
    import asyncio
    
    async def _call_tool_async():
        mcp_client = MCPClient(url="{tool_source_url}")
        async with mcp_client.connect_streamable_http() as session:
            result = await session.call_tool("{tool.name}", {tool_params_dict})
            return result.structuredContent
    
    try:
        # Try to get the current event loop
        loop = asyncio.get_running_loop()
        # If we're in an async context, we need to run in a new thread
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, _call_tool_async())
            return future.result()
    except RuntimeError:
        # No event loop running, use asyncio.run (works for sync functions)
        return asyncio.run(_call_tool_async())
"""
    else:
        return f"""@mcp.tool(output_schema={tool_output_schema_string})
def {function_name}({tool_params_string}):
    api_client = ApiClient(url="{tool_source_url}")
    result = api_client.call_api({function_name}, {tool_params_string})
    return result
"""

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

def generate_mcp_tool_function_from_widget_id(widget_id: str, server_type: WidgetServerTypeEnum) -> str:
    widget_repo = WidgetRepository()
    widget: Widget = widget_repo.get_by_id(widget_id)

    function_name = generate_external_widget_id(widget)
    ui_widget_resource_repo = UiWidgetResourceRepository()
    ui_widget_resource: UiWidgetResource = ui_widget_resource_repo.get_by_id(widget.ui_widget_resource_id)
    html_content = ui_widget_resource.resource['resource']['text']

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
        return f"""
    def call_tool_{function_name}():
        pass

    _widget_{function_name} = {{ 
        "tool_name": "{function_name}",
        "title": "{widget.description}",
        "resource_description": "{widget.description}",
        "template_uri": "{ui_widget_resource.resource['resource']['uri']}",
        "invoking": "invoking {function_name}",
        "invoked": "invoked {function_name}",
        "html": "\"\"{html_content}\"\"",
        "response_text": "response text {function_name}",
        "input_schema": {{"properties": {{}}, "title": "Input", "type": "object"}},
        "call_tool": call_tool_{function_name},
    }}

    widgets.append(_widget_{function_name})

"""

    return f"""@mcp.tool()
def {function_name}() -> dict:
    ui_resource = create_ui_resource({{
        "uri": "ui://greeting/simple",
        "content": {{
            "type": "rawHtml",
            "htmlString": \"\"\"{html_content}\"\"\"
        }},
        "encoding": "text"
    }})
    return ui_resource
"""