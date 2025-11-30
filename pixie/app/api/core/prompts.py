"""System prompts for LLM code generation and responses."""
import json
from typing import Any

from app.db.models.tools import Tool


def build_ui_improvements_response_prompt(tools: list[Tool]) -> str:
    """ 
    Build system prompt for generating text responses.
    
    Args:
        user_message: User's original message
        tools: List of tool objects containing tool information
    Returns:
        Formatted system prompt
    """
    # Build tool details list (only include enabled tools)
    tool_details = []
    for tool in tools:
        if not tool.is_enabled:
            continue
            
        tool_info = f"""- Tool ID: {tool.id}
- Tool Name: {tool.name}
- Tool Description: {tool.description}"""
        if tool.title:
            tool_info += f"\n- Tool Title: {tool.title}"
        tool_details.append(tool_info)
    
    tools_section = "\n\n".join(tool_details) if tool_details else "No tools available."
    return f"""You are an assistant helping users iteratively improve a generated UI.

You will be shown:
- The CURRENT generated HTML/React UI for the user's request
- The original user's request

Your job is to suggest the next 1-2 *highest-impact* improvements the user could ask for.

# Following are the tools available that users can use to improve the UI :
{tools_section}

CRITICAL OUTPUT REQUIREMENTS:
- ONLY suggest the **next 1-2 improvements** the user could ask for (no more).
- Focus on UX, clarity, and usefulness (not on minor pixel tweaks).
- Do NOT include any code or HTML in your answer.
- Do NOT repeat the entire user message or HTML description.
- Keep the response short, concrete, and actionable.

MARKDOWN FORMATTING GUIDELINES:
- Use a short intro sentence (optional).
- Then use a numbered list (1., 2., 3.) for the suggested improvements.
- Use **bold** for the main improvement name, and plain text to briefly explain why.
- Keep each item to 1–2 short sentences.
Your answer must be helpful, accurate, and **markdown-formatted**."""


def build_ui_generation_system_prompt(
    tools: list[Tool],
    user_message: str,
    has_existing_ui: bool = False,
    designs: dict[str, Any] | None = None,
) -> str:
    """
    Build base system prompt for generating React UI components.
    
    Args:
        tools: List of tool objects containing tool information
        user_message: User's current request
        conversation_context: Conversation history
        has_existing_ui: Whether there's an existing UI to modify
        designs: Dictionary with 'logos' and 'ux_designs' lists containing design information
        
    Returns:
        Complete system prompt for UI generation
    """
    # Build tool details list (only include enabled tools)
    tool_details = []
    for tool in tools:
        if not tool.is_enabled:
            continue
            
        tool_info = f"""
    - Tool ID: {tool.id}
    - Tool Name: {tool.name}
    - Tool Description: {tool.description}"""
        if tool.title:
            tool_info += f"""
    - Tool Title: {tool.title}"""
        
        # Add input schema
        if tool.inputSchema:
            input_schema_str = json.dumps(tool.inputSchema, indent=4)
            tool_info += f"""
    - Input Schema (JSON Schema for parameters):
{input_schema_str}"""
        
        # Add output schema if available
        if tool.outputSchema:
            output_schema_str = json.dumps(tool.outputSchema, indent=4)
            tool_info += f"""
    - Output Schema (JSON Schema for return value):
{output_schema_str}"""
        
        tool_details.append(tool_info)
    
    tools_section = "\n\n".join(tool_details) if tool_details else "No tools available."

    # Build designs section if available
    designs_section = ""
    if designs:
        logos = designs.get("logos", [])
        ux_designs = designs.get("ux_designs", [])
        if logos or ux_designs:
            designs_section = "\n\n<design_assets>\n"
            if logos:
                designs_section += "  <logos>\n"
                for logo in logos:
                    if hasattr(logo, "filename"):
                        filename = logo.filename
                        content_type = logo.content_type
                        file_size = logo.file_size
                    else:
                        filename = logo.get("filename", "Unknown")
                        content_type = logo.get("content_type", "unknown type")
                        file_size = logo.get("file_size", 0)
                    designs_section += (
                        f"    - {filename} ({content_type}, {file_size} bytes)\n"
                    )
                designs_section += (
                    "    INSTRUCTIONS:\n"
                    "    - Use these logo images as inspiration for brand identity, color palette, and visual style.\n"
                    "    - Use them to choose colors and overall visual tone.\n"
                )
                designs_section += "  </logos>\n"
            if ux_designs:
                designs_section += "  <ux_designs>\n"
                for ux in ux_designs:
                    if hasattr(ux, "filename"):
                        filename = ux.filename
                        content_type = ux.content_type
                        file_size = ux.file_size
                    else:
                        filename = ux.get("filename", "Unknown")
                        content_type = ux.get("content_type", "unknown type")
                        file_size = ux.get("file_size", 0)
                    designs_section += (
                        f"    - {filename} ({content_type}, {file_size} bytes)\n"
                    )
                designs_section += (
                    "    INSTRUCTIONS:\n"
                    "    - Use these UX designs as inspiration for layout, spacing, hierarchy, and patterns.\n"
                    "    - Match the general aesthetic and structure, but do not copy them pixel-perfect.\n"
                )
                designs_section += "  </ux_designs>\n"
            designs_section += "</design_assets>\n"
    task_mode = "EDIT_EXISTING_UI" if has_existing_ui else "CREATE_NEW_UI"

    prompt = f"""You are an expert frontend engineer generating small self-contained React apps
inside a single HTML document. The HTML will run inside a Pixie iframe, powered by React 18, ReactDOM 18,
Babel standalone, and the PixieApps SDK.

<context>
- Tools:
{tools_section}

- User's latest request (may include existing HTML or code):
{user_message}

- Designs (if available): {designs_section}
</context>

<task_mode>
{task_mode}
</task_mode>

<overall_objective>
- Build a compact, production-ready UI that:
  - Integrates with Pixie tools via window.pixie.callTool(...)
  - Fits comfortably in a viewport of ~500px height (avoid long scrolling pages)
  - Is visually coherent and easy to understand without extra explanation
</overall_objective>
"""

    # EDITING RULES (surgical changes)
    if has_existing_ui:
        prompt += """
<editing_rules>
- There is an EXISTING HTML document in the conversation/user message.
- Your job is to **EDIT that existing UI surgically**, not rewrite it from scratch.
- Treat the existing HTML as the canonical source of truth.

When editing:
- FIRST, carefully read the existing HTML and understand its structure and styles.
- THEN, identify the MINIMAL set of changes required to satisfy the user's latest request.
- ONLY change the parts that are strictly necessary:
  - Keep component structure the same unless a change is explicitly required.
  - Preserve existing formatting, whitespace, and naming wherever possible.
  - Do NOT reorder components, refactor code, or restyle unrelated parts.
- Do NOT introduce large refactors unless the user explicitly requests them.
- The final output MUST be the full HTML document, identical to the original except for the minimal edits you made.
</editing_rules>
"""
    else:
        prompt += """
<creation_rules>
- There is NO reliable existing UI to preserve.
- Build a NEW HTML document from scratch that satisfies the user's request.
- Keep the layout simple, with clear hierarchy and minimal nesting.
- Avoid unnecessary complexity or extra features that were not requested.
</creation_rules>
"""

    prompt += f"""
<code_quality_rules>
1. STRUCTURAL VALIDITY
   - Every HTML tag MUST have a matching closing tag.
   - Every JSX element MUST be properly closed: <Component /> or <Component></Component>.
   - All braces {{}}, brackets [], and parentheses () MUST be balanced.
   - All strings and template literals MUST be properly closed.

2. REACT & JSX
   - Use JSX syntax inside a single `<script type="text/babel">` block.
   - Define React components as functions or arrow functions.
   - Use `ReactDOM.createRoot(document.getElementById("root")).render(<App />)` as the entry point.
   - Do NOT use TypeScript syntax; use plain JavaScript + JSX.
   - Avoid unused state, effects, and imports.

3. JAVASCRIPT VALIDITY
   - All functions MUST have complete bodies.
   - No trailing commas that would break old browsers.
   - Avoid referencing variables before they are declared.
   - Handle obvious edge cases (e.g. empty arrays) gracefully where relevant.

4. HTML STRUCTURE
   - MUST include `<!DOCTYPE html>` at the top.
   - MUST include `<html lang="en">`, `<head>`, and `<body>`.
   - `<head>` MUST include at least:
     - `<meta charset="UTF-8">`
     - `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
     - `<title>` with a short, descriptive title
     - React 18 and ReactDOM 18 from a CDN
     - Babel standalone script for JSX
     - `<script src="/client/pixie-apps-sdk.bundle.js"></script>`
   - `<body>` MUST include `<div id="root"></div>` for React mounting.
   - Keep overall layout height around 500px; prefer internal scrolling containers over full-page scrolling.

5. FUNCTIONAL REQUIREMENTS
   - The HTML MUST be immediately runnable in a browser with no syntax errors.
   - All interactive elements MUST have appropriate handlers (onClick, onChange, etc.) if they appear interactive.
   - Tool calls MUST use the Pixie SDK: `window.pixie.callTool(toolName, params)` with async/await or .then/.catch.
   - Respect each tool's input and output schema when constructing tool calls.
</code_quality_rules>

<pixie_tooling>
- window.pixie.callTool(name, params): Call tools asynchronously; returns a Promise.
- window.pixie.sendFollowUpMessage({{prompt}}): Send follow-up messages.
- window.pixie.openExternal({{href}}): Open external links.
- window.pixie.toolInput / toolOutput: Access current tool data.
- window.pixie.widgetState / setWidgetState: Read and update widget state.
- window.pixie.theme, locale, userAgent: Environment info.
When calling tools:
- Use the EXACT Tool Name from the tools list above.
- Pass tool parameters as an object: {{ param1: value1, param2: value2 }}
- Always handle success and error cases.
</pixie_tooling>

<output_format>
- Your response MUST be a single, complete HTML document.
- The response MUST:
  - START with `<!DOCTYPE html>` or `<html`
  - END with `</html>`
- DO NOT wrap the HTML in markdown code fences (no ```html).
- DO NOT add any explanations, comments, or prose before or after the HTML.
- DO NOT include JS comments explaining what you did.
- Output ONLY the raw HTML.
</output_format>

<validation_checklist>
Before you finish, silently verify:
- [ ] All HTML tags open/close correctly.
- [ ] All JSX elements and fragments are closed correctly.
- [ ] All braces/brackets/parentheses and strings are balanced.
- [ ] ReactDOM.render (or createRoot) is called exactly once with the root element.
- [ ] All referenced variables and functions are defined.
- [ ] All script tags are properly closed.
- [ ] Pixie SDK script (`/client/pixie-apps-sdk.bundle.js`) is included in `<head>`.
- [ ] `<div id="root"></div>` exists in `<body>`.
- [ ] Page layout is compact (roughly <= 500px height) or uses internal scroll where necessary.
Fix any problems you notice BEFORE returning the final HTML.
</validation_checklist>
"""

    return prompt


def build_ui_generation_user_message(
    user_message: str,
) -> str:
    """
    Build user message for UI generation request.
    
    Args:
        user_message: User's request (may include existing HTML to edit)
        
    Returns:
        Formatted user message
    """
    user_content = f"""You are generating or updating a React-based HTML UI for Pixie tools.

User request:
{user_message}

IMPORTANT:
- If the conversation above includes an existing HTML document, treat it as the CURRENT UI and edit it surgically.
- If no usable HTML is present, create a new compact UI from scratch.
- Use any design images (logos or UX designs) passed in the conversation as visual inspiration only, not as something to copy exactly.
- Always assume this UI will be embedded in a relatively small Pixie widget (around 500px height)."""
    return user_content


def build_output_schema_inference_prompt(tool_name: str, tool_description: str, tool_output: Any) -> str:
    """
    Build system prompt for inferring JSON Schema from tool output.
    
    Args:
        tool_name: Name of the tool
        tool_description: Description of the tool
        tool_output: The actual output from the tool call
        
    Returns:
        Formatted system prompt for schema inference
    """
    import json
    
    # Convert tool output to JSON string for the prompt
    try:
        if isinstance(tool_output, (dict, list)):
            output_str = json.dumps(tool_output, indent=2)
        else:
            output_str = json.dumps(tool_output, indent=2)
    except (TypeError, ValueError):
        output_str = str(tool_output)
    
    return f"""You are a JSON Schema expert. Your task is to analyze a tool's output and generate a valid JSON Schema that describes its structure.

Tool Information:
- Name: {tool_name}
- Description: {tool_description}

Tool Output:
{output_str}

CRITICAL REQUIREMENTS:
1. Analyze the structure of the tool output above.
2. Generate a valid JSON Schema (draft 7 or later) that accurately describes the output structure.
3. Include appropriate types, required fields, descriptions, and constraints.
4. For nested objects, include complete schema definitions.
5. For arrays, include the schema for array items.
6. Use descriptive titles and descriptions for properties when possible.
7. The schema should be comprehensive but not overly restrictive.

OUTPUT FORMAT:
- Return ONLY a valid JSON object representing the JSON Schema.
- Do NOT include any markdown formatting, code blocks, or explanatory text.
- The response must be valid JSON that can be parsed directly."""
