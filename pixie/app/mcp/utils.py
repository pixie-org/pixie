import json
from typing import Any
from pathlib import Path

from jinja2 import Template


def generate_server_files(server_name: str, tool_functions: list[str], resource_functions: list[str], mcp_config: dict[str, Any], all_requirements: list[str], output_dir: Path, pixie_sdk_import: str):
    """Generate all server files (main.py, Dockerfile, requirements.txt)."""
    server_template_dir = Path(__file__).parent.parent.parent / "templates" / "mcp" / "server"

    main_py_template = Template((server_template_dir / "main.py.j2").read_text())
    dockerfile_template = Template((server_template_dir / "Dockerfile.j2").read_text())
    requirements_template = Template((server_template_dir / "requirements.txt.j2").read_text())

    main_rendered = main_py_template.render(
        server_name=server_name,
        tool_functions=tool_functions,
        resources=resource_functions,
        mcp_config_json=json.dumps(mcp_config, indent=4),
        pixie_sdk_import=pixie_sdk_import
    )
    main_output = output_dir / "main.py"
    main_output.write_text(main_rendered)

    print(f"✅ Generated: {main_output}")

    dockerfile_rendered = dockerfile_template.render(server_name=server_name)
    dockerfile_output = output_dir / "Dockerfile"
    dockerfile_output.write_text(dockerfile_rendered)
    print(f"✅ Generated: {dockerfile_output}")

    requirements_rendered = requirements_template.render(requirements=all_requirements)
    requirements_output = output_dir / "requirements.txt"
    requirements_output.write_text(requirements_rendered)
    print(f"✅ Generated: {requirements_output}")
