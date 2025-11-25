#!/usr/bin/env python3
"""Generate MCP server file from template."""
import argparse
import sys
from pathlib import Path

try:
    from jinja2 import Template
except ImportError:
    print("Error: jinja2 is required. Install it with: pip install jinja2")
    sys.exit(1)


def generate_server(server_name: str, output_path: str = None, tool_functions: list[str] = None, output_dir: Path = None, additional_requirements: list[str] = None):
    """Generate MCP server file from template.
    
    Args:
        server_name: Name for the MCP server (used in FastMCP initialization)
        output_path: Optional output file path. If not provided, uses {server_name}_server.py
        tool_functions: Optional list of tool function definition strings (each should include @mcp.tool() decorator)
        output_dir: Optional directory for deployment files. If provided, generates all deployment files.
        additional_requirements: Optional list of additional Python package requirements (e.g., ["requests>=2.28.0", "pandas>=1.5.0"])
    
    Returns:
        Path to the generated file
    """
    # Get the template directory (this script's parent directory)
    template_dir = Path(__file__).parent
    template_path = template_dir / "main.py.j2"
    
    if not template_path.exists():
        raise FileNotFoundError(f"Template not found: {template_path}")
    
    # Load and render template
    template = Template(template_path.read_text())
    rendered = template.render(
        server_name=server_name,
        tool_functions=tool_functions or []
    )
    
    # Determine output path
    if output_path:
        output_file = Path(output_path)
    else:
        # Convert server name to valid Python filename
        safe_name = server_name.replace("-", "_").replace(" ", "_")
        output_file = Path(f"{safe_name}_server.py")
    
    # If output_dir is provided, use it for main.py
    if output_dir:
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_file = output_dir / "main.py"
    
    # Ensure output directory exists
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    # Write the generated file
    output_file.write_text(rendered)
    print(f"✅ Generated MCP server: {output_file}")
    print(f"   Server name: {server_name}")
    if tool_functions:
        print(f"   Tools: {len(tool_functions)}")
    
    # Generate deployment files if output_dir is provided
    if output_dir:
        generate_deployment_files(server_name, output_dir, additional_requirements)
    
    return output_file


def generate_deployment_files(server_name: str, output_dir: Path, additional_requirements: list[str] = None):
    """Generate server bundle files (Dockerfile and requirements.txt).
    
    Args:
        server_name: Name for the MCP server
        output_dir: Directory to write deployment files
        additional_requirements: Optional list of additional Python package requirements
    """
    template_dir = Path(__file__).parent
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate Dockerfile
    dockerfile_template = Template((template_dir / "Dockerfile.j2").read_text())
    dockerfile_path = output_dir / "Dockerfile"
    dockerfile_path.write_text(dockerfile_template.render(server_name=server_name))
    print(f"✅ Generated Dockerfile: {dockerfile_path}")
    
    # Generate requirements.txt
    # Default requirements for MCP server
    default_requirements = [
        "mcp>=1.19.0",
        "mcp-ui-server>=0.1.0"
    ]
    # Combine default and additional requirements
    all_requirements = default_requirements + (additional_requirements or [])
    
    req_template = Template((template_dir / "requirements.txt.j2").read_text())
    req_path = output_dir / "requirements.txt"
    req_path.write_text(req_template.render(requirements=all_requirements))
    print(f"✅ Generated requirements.txt: {req_path}")
    print(f"   Requirements: {len(all_requirements)} packages")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate MCP server from template",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s my-custom-server
  %(prog)s my-custom-server -o app/mcp/my_server.py
  %(prog)s "My Server Name" -o /path/to/output/main.py
  %(prog)s my-custom-server -d ./deploy  # Generate all deployment files
  %(prog)s my-custom-server -d ./deploy -r "requests>=2.28.0" -r "pandas>=1.5.0"
  %(prog)s my-custom-server -d ./deploy --requirements-file extra-requirements.txt
        """
    )
    parser.add_argument(
        "server_name",
        help="Name for the MCP server (used in FastMCP initialization)"
    )
    parser.add_argument(
        "-o", "--output",
        help="Output file path (default: {server_name}_server.py in current directory)"
    )
    parser.add_argument(
        "-d", "--deploy-dir",
        help="Generate server bundle files (main.py, Dockerfile, requirements.txt) in this directory"
    )
    parser.add_argument(
        "-r", "--requirements",
        action="append",
        help="Additional Python package requirements (can be specified multiple times, e.g., -r 'requests>=2.28.0' -r 'pandas>=1.5.0')"
    )
    parser.add_argument(
        "--requirements-file",
        help="Path to a requirements file to read additional requirements from (one per line)"
    )
    
    args = parser.parse_args()
    
    # Collect additional requirements
    additional_requirements = []
    if args.requirements:
        additional_requirements.extend(args.requirements)
    if args.requirements_file:
        req_file = Path(args.requirements_file)
        if req_file.exists():
            additional_requirements.extend([
                line.strip() for line in req_file.read_text().splitlines()
                if line.strip() and not line.strip().startswith("#")
            ])
        else:
            print(f"⚠️  Warning: Requirements file not found: {req_file}", file=sys.stderr)
    
    try:
        generate_server(
            args.server_name,
            args.output,
            output_dir=Path(args.deploy_dir) if args.deploy_dir else None,
            additional_requirements=additional_requirements if additional_requirements else None
        )
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)

