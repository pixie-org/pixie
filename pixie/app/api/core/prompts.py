"""System prompts for LLM code generation and responses."""
import json
from typing import Any

from app.db.models.tools import Tool


def build_text_response_prompt(user_message: str, tools: list[Tool]) -> str:
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
        # Skip disabled tools
        if not tool.is_enabled:
            continue
            
        tool_info = f"""- Tool ID: {tool.id}
- Tool Name: {tool.name}
- Tool Description: {tool.description}"""
        if tool.title:
            tool_info += f"\n- Tool Title: {tool.title}"
        tool_details.append(tool_info)
    
    tools_section = "\n\n".join(tool_details) if tool_details else "No tools available."
    
    return f"""You are an assistant helping users create a UI based on the few tools. Look at the HTML content generated for the user's request and suggest top 2-3 improvements that user can do next to improve the html content further.

# User's Request and generated HTML content:
{user_message}

# Tool Details:
{tools_section}

CRITICAL OUTPUT REQUIREMENTS:
- The response MUST be concise and to the point and MUST ONLY suggest top 2-3 improvements that user can do next to improve the html content further.
- Format your response using Markdown syntax for better readability
- Use Markdown formatting: **bold**, *italic*, `code`, lists, headers, etc.
- Do not include code examples in your response.
- Do NOT include HTML tags or React components (the UI is generated separately)
- Keep responses conversational and well-formatted with Markdown

MARKDOWN FORMATTING GUIDELINES:
- Use **bold** for emphasis on important points
- Use `backticks` for inline code, function names, or technical terms
- Use bullet points (-) or numbered lists for multiple items
- Use headers (# ##) sparingly for sections if needed
- Keep formatting clean and readable

Provide helpful, accurate, markdown-formatted responses."""


def build_ui_generation_prompt_base(
    tools: list[Tool],
    user_message: str,
    conversation_context: str,
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
        # Skip disabled tools
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
    
    # Format conversation context
    formatted_context = (
        conversation_context[:1000] if len(conversation_context) > 500 else conversation_context
    )
    
    # Build designs section if available
    designs_section = ""
    if designs:
        logos = designs.get("logos", [])
        ux_designs = designs.get("ux_designs", [])
        
        if logos or ux_designs:
            designs_section = "\n\n- Available Designs for Visual Inspiration:\n"
            
            if logos:
                designs_section += "  * Logos (included as images in the message - you can see them visually):\n"
                for logo in logos:
                    # Handle both Design objects and dicts
                    if hasattr(logo, 'filename'):
                        filename = logo.filename
                        content_type = logo.content_type
                        file_size = logo.file_size
                    else:
                        filename = logo.get('filename', 'Unknown')
                        content_type = logo.get('content_type', 'unknown type')
                        file_size = logo.get('file_size', 0)
                    designs_section += f"    - {filename} ({content_type}, {file_size} bytes)\n"
                designs_section += "    CRITICAL: These logo images are included in the message content as image blocks. You MUST:\n"
                designs_section += "    - Look at these logos to understand the brand identity, color scheme, and visual style\n"
                designs_section += "    - Use these logos as visual inspiration for the UI design (colors, style, branding elements)\n"
                designs_section += "    - Incorporate the logos directly into the generated UI by converting them to base64 data URLs in <img> tags\n"
                designs_section += "    - Match the color palette, typography, and overall aesthetic from these logos\n"
            
            if ux_designs:
                designs_section += "  * UX Designs (included as images in the message - you can see them visually):\n"
                for ux in ux_designs:
                    # Handle both Design objects and dicts
                    if hasattr(ux, 'filename'):
                        filename = ux.filename
                        content_type = ux.content_type
                        file_size = ux.file_size
                    else:
                        filename = ux.get('filename', 'Unknown')
                        content_type = ux.get('content_type', 'unknown type')
                        file_size = ux.get('file_size', 0)
                    designs_section += f"    - {filename} ({content_type}, {file_size} bytes)\n"
                designs_section += "    CRITICAL: These UX design images are included in the message content as image blocks. You MUST:\n"
                designs_section += "    - Study these UX designs carefully to understand the layout patterns, component styles, and visual hierarchy\n"
                designs_section += "    - Use these designs as visual inspiration for layout, spacing, typography, and component design\n"
                designs_section += "    - Match the overall aesthetic, color schemes, and design patterns shown in these images\n"
                designs_section += "    - Adapt the design principles (not copy exactly) to create a cohesive UI that matches the visual style\n"
    
    prompt = f"""You are an expert React UI component generator. Your task is to generate production-ready, bug-free HTML with embedded React components.

CONTEXT:
- Tools:
{tools_section}
- User's Request: {user_message}
- Conversation History: {formatted_context}{designs_section}

"""

    if has_existing_ui:
        prompt += """
CRITICAL - MODIFYING EXISTING UI - ABSOLUTE REQUIREMENTS:

THERE IS AN EXISTING UI. YOU MUST FOLLOW THESE RULES WITH ABSOLUTE PRECISION.

Step 1: Read the user's request carefully and identify EXACTLY what they want changed
Step 2: Locate the EXACT code section in the existing HTML that needs modification
Step 3: Make ONLY the minimal change required - nothing more
Step 4: Copy ALL other code exactly as it appears - character by character
Step 5: Verify that your change doesn't affect any other part of the code
Step 6: Ensure the change integrates seamlessly without breaking anything

## EXAMPLES OF CORRECT BEHAVIOR
   User: "change the button color to blue"
   ✓ CORRECT: Find the button, change ONLY its color property, keep everything else identical
   ✗ WRONG: Change button color AND modify layout, spacing, or other styles

   User: "add a new input field"
   ✓ CORRECT: Add ONLY the new input field, keep all existing fields and code unchanged
   ✗ WRONG: Add input field AND modify existing fields, styles, or structure

   User: "remove the header"
   ✓ CORRECT: Remove ONLY the header element, keep everything else exactly as it was
   ✗ WRONG: Remove header AND modify layout, spacing, or other components

REMEMBER: Your ONLY job is to make the EXACT change requested. Everything else must remain IDENTICAL to the existing code.
"""

    prompt += """
CODE QUALITY REQUIREMENTS (CRITICAL - FOLLOW STRICTLY):

1. STRUCTURAL VALIDITY:
   - Every opening tag MUST have a matching closing tag
   - All JSX expressions MUST be properly closed: <Component /> or <Component></Component>
   - All function calls and object literals MUST have balanced braces {{ }}
   - All parentheses must be balanced
   - DO NOT leave components or functions incomplete

2. REACT SPECIFIC RULES:
   - Use React.createElement syntax OR JSX with Babel standalone
   - All component definitions MUST be complete (opening and closing)
   - All useState, useEffect, and other hooks MUST have complete implementations
   - All event handlers must be fully defined
   - All conditional rendering ({{condition && <Component />}} or {{condition ? <A /> : <B />}}) must be properly closed

3. JAVASCRIPT VALIDITY:
   - All functions must have complete bodies (no truncated code)
   - All object literals must have balanced braces
   - All arrays must have balanced brackets
   - All template literals (backticks) must be properly closed
   - All strings must have matching quotes

4. HTML STRUCTURE:
   - MUST include complete <!DOCTYPE html> declaration
   - MUST include opening <html> tag with lang attribute
   - MUST include complete <head> section with:
     * <meta charset="UTF-8">
     * <meta name="viewport" content="width=device-width, initial-scale=1.0">
     * <title> tag with appropriate title
     * React CDN scripts (react@18, react-dom@18)
     * Babel standalone for JSX transformation
     * <script src="/client/pixie-apps-sdk.bundle.js"></script> (REQUIRED - must be included)
     * Any additional libraries (Chart.js, etc.) if needed
   - MUST include complete <body> section
   - MUST include <div id="root"></div> for React mounting
   - MUST include complete <script type="text/babel"> section
   - MUST close all tags: </script>, </body>, </html>
   - MUST ensure html content height is less than 500px

5. COMPLETENESS CHECKS:
   - Before finishing, count all opening and closing tags - they MUST match
   - Verify all React components render properly (must call ReactDOM.render at the end)
   - Ensure all imported libraries are actually used or remove unused imports
   - All CSS classes referenced in JSX must be defined in <style> tag
   - All JavaScript variables referenced must be defined

6. FUNCTIONAL REQUIREMENTS:
   - Code MUST be immediately runnable in a browser
   - No syntax errors that would prevent execution
   - All interactive elements must have proper event handlers
   - Error handling for edge cases (empty arrays, null values, etc.)
   
7. TOOL CALLING (CRITICAL):
   - The PixieAppsSdk bundle provides window.pixie object with tool calling capabilities
   - To call tools, use: window.pixie.callTool(tool_name, tool_params)
   - Example: window.pixie.callTool('get_weather', {{ location: 'New York' }})
   - Look at the output Schema for the tool to understand the expected output structure.
   - Always handle tool calls with async/await or .then()/.catch()
   - The PixieAppsSdk automatically initializes and attaches to window.pixie when the script loads
   - Available tool names are listed in the Tools section above - use the exact Tool Name when calling

8. CODE GENERATION PROCESS:
   - Write code step-by-step, ensuring each section is complete before moving on
   - After writing each major section (HTML structure, React components, styling), verify it's complete
   - Before outputting, mentally trace through the code structure:
     * Count opening/closing tags
     * Verify all functions are complete
     * Ensure React component tree is complete
     * Check that all required imports are present"""

    
    prompt += """

OUTPUT FORMAT REQUIREMENTS:
- Return ONLY raw HTML code starting with <!DOCTYPE html>
- NO markdown code blocks (no ```html or ``` markers)
- NO explanatory text before or after the HTML
- NO comments like "Here's the HTML:" or "Here's the updated code:"
- NO code comments explaining what you did
- The response must START with <!DOCTYPE html> or <html
- The response must END with </html>
- Return the complete, valid HTML document with no wrapping text

VALIDATION CHECKLIST (apply before outputting):
[ ] All HTML tags are properly closed
[ ] All JSX components are complete
[ ] All JavaScript functions have complete bodies
[ ] ReactDOM.render() is called with proper component
[ ] All braces, brackets, and parentheses are balanced
[ ] All strings are properly quoted and closed
[ ] Document has <!DOCTYPE html>, <html>, <head>, <body> tags
[ ] All CDN scripts are included and properly closed
[ ] <script src="/client/pixie-apps-sdk.bundle.js"></script> is included in <head>
[ ] Tool calls use window.pixie.callTool(tool_name, tool_params) syntax
[ ] <div id="root"> exists and React component renders into it
[ ] The total height of the page should be less than 500px

PIXIEAPPS SDK INFORMATION:
The PixieAppsSdk bundle (/client/pixie-apps-sdk.bundle.js) provides:
- window.pixie.callTool(name, params): Call tools asynchronously (returns Promise)
- window.pixie.sendFollowUpMessage({ prompt }): Send follow-up messages
- window.pixie.openExternal({ href }): Open external links
- window.pixie.toolInput: Access tool input parameters
- window.pixie.toolOutput: Access tool output data
- window.pixie.widgetState: Access and modify widget state
- window.pixie.setWidgetState(state): Update widget state
- window.pixie.theme: Current theme ('light' or 'dark')
- window.pixie.locale: Current locale
- window.pixie.userAgent: User agent information

When calling tools:
1. Use the exact Tool Name from the Tools section above
2. Pass tool parameters as an object: {{ param1: value1, param2: value2 }}
3. Handle the Promise response: const result = await window.pixie.callTool('tool_name', {{ param: value }})
4. Always include error handling for tool calls"""
    
    return prompt


def build_ui_generation_user_message(
    user_message: str,
) -> str:
    """
    Build user message for UI generation request.
    
    Args:
        tools: List of tool objects containing tool information
        user_message: User's request
        existing_html: Existing HTML to modify (if any)
        
    Returns:
        Formatted user message
    """
    user_content = f"""Generate a new or update the existing React HTML UI for tools based on the user's request: {user_message}

IMPORTANT: If design images (logos or UX designs) are included in this message, use them as visual inspiration for:
- Color schemes and palette
- Typography and font choices
- Layout patterns and component styles
- Overall aesthetic and visual hierarchy
- Brand identity elements"""
  
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
1. Analyze the structure of the tool output above
2. Generate a valid JSON Schema (draft 7 or later) that accurately describes the output structure
3. Include appropriate types, required fields, descriptions, and constraints
4. For nested objects, include complete schema definitions
5. For arrays, include the schema for array items
6. Use descriptive titles and descriptions for properties when possible
7. The schema should be comprehensive but not overly restrictive

OUTPUT FORMAT:
Return ONLY a valid JSON Schema object. Do not include any markdown formatting, code blocks, or explanatory text.
The response must be valid JSON that can be parsed directly.

Example of expected output format:
{{
  "type": "object",
  "properties": {{
    "field1": {{
      "type": "string",
      "description": "..."
    }},
    "field2": {{
      "type": "number",
      "description": "..."
    }}
  }},
  "required": ["field1"]
}}

Generate the JSON Schema now:"""

