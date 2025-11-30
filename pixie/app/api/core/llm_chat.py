"""LLM chat service for generating responses and UI resources."""
import base64
import logging
import re
from typing import Any

from app.api.core.llm_client import LLMClient
from app.api.core.prompts import (
    build_ui_improvements_response_prompt,
    build_ui_generation_system_prompt,
    build_ui_generation_user_message,
)
from app.api.models.tools import ToolResponse
from app.db.models.chat import Message
from app.db.models.designs import DesignTypeEnum
from app.db.storage.design_repository import DesignRepository
from app.server.config import get_settings

logger = logging.getLogger(__name__)

def extract_html_from_ui_resource(ui_resource: dict[str, Any] | None) -> str | None:
    """Extract HTML text from UI resource structure."""
    if not ui_resource or not isinstance(ui_resource, dict):
        return None
    
    resource = ui_resource.get("resource", {})
    if isinstance(resource, dict):
        html = resource.get("text")
        if html:
            return html

class LlmChat:
    """
    LLM chat service for generating conversational responses and UI resources.
    
    This class handles the interaction with LLM services to generate:
    - Text responses based on user messages and conversation history
    - UI resources (React HTML) that match the tool's context and user needs
    
    Supports OpenAI, Anthropic (Claude), and Google (Gemini) providers via litellm unified interface.
    """

    def __init__(self):
        """Initialize the LLM chat service with configured provider."""
        settings = get_settings()
        self.max_ui_tokens = settings.llm_ui_max_tokens
        self.llm_client = LLMClient()
        self.ui_generation_temperature = 0.3

    def generate_response(
        self,
        widget_id: str,
        project_id: str,
        tools: list[ToolResponse],
        user_message: str,
        previous_messages: list[Message],
    ) -> tuple[str, dict[str, Any]]:
        """
        Generate a response text and UI resource based on the tools, user message, and conversation history.
        
        Args:
            widget_id: The ID of the widget
            tools: The list of tool objects containing tool information
            user_message: The user's message/query
            previous_messages: List of previous messages in the conversation (for context)
        
        Returns:
            Tuple of (response_text, ui_resource_dict)
            - response_text: The generated text response
            - ui_resource_dict: The generated UI resource dictionary
        """
        html_content = self._generate_ui_resource(
            widget_id=widget_id,
            project_id=project_id,
            tools=tools,
            user_message=user_message,
            previous_messages=previous_messages,
        )

        if html_content and isinstance(html_content, dict) and html_content.get("html_content"):
            user_message = f"Required UI description or improvements to the HTML content: {user_message}\n\n" + \
                f"Following is the HTML content generated for the user's request: {html_content['html_content']}"

        try:
            response_text = self._generate_text_response(
                tools=tools,
                user_message=user_message,
                previous_messages=previous_messages,
                existing_html=html_content.get("html_content")
            )
        except Exception as e:
            logger.error(f"LLM response generation failed: {e}", exc_info=True)
            response_text = "I'm sorry, I'm having trouble generating a response. Please try again later."

        if html_content and isinstance(html_content, dict) and html_content.get("html_content"):
            ui_resource = {
                "type": "resource",
                "resource": {
                    "uri": f"ui://widget/{widget_id}",
                    "mimeType": "text/html",
                    "text": html_content["html_content"],
                },
            }
        else:
            ui_resource = None

        return response_text, ui_resource

    def _generate_text_response(
        self,
        tools: list[ToolResponse],
        user_message: str,
        previous_messages: list[Message],
        existing_html: str | None = None,
    ) -> str:
        """
        Generate response using the specified provider.
        
        Args:
            tools: The list of tool objects containing tool information
            user_message: User's current message
            conversation_context: Formatted conversation history
            existing_html: Existing HTML content
        
        Returns:
            Generated response text
        """
        system_prompt = build_ui_improvements_response_prompt(tools=tools)
        messages = []
        for message in previous_messages[:-1]:
            messages.append({"role": message.role.value, "content": message.content})

        message_content: list[dict[str, Any]] = [{"type": "text", "text": user_message}]
        if existing_html:
            message_content.append({"type": "text", "text": f"\n\n<existing_html>\n{existing_html}\n</existing_html>"})
        messages.append({"role": "user", "content": message_content})

        response_text, _ = self.llm_client.call(
            messages=messages,
            system=system_prompt,
            temperature=self.ui_generation_temperature,
            max_tokens=1000,
        )
        return response_text

    def _fetch_designs_for_llm(self) -> dict[str, Any]:
        """
        Fetch logos and UX designs from database for inclusion in LLM prompts.
        
        Returns:
            Dictionary with 'logos' and 'ux_designs' (both as Design objects with file_data for images)
        """
        try:
            repo = DesignRepository()
            
            # Fetch latest logos (limit to 3 most recent to avoid token limits)
            logos = [
                logo for logo in repo.list_by_type(DesignTypeEnum.LOGO)[:5]
                if logo.file_size < 2 * 1024 * 1024 and logo.content_type.startswith("image/")
            ][:3]  # Limit to 3 logos max
            
            # Fetch latest UX designs (limit to 3 most recent, include images for visual inspiration)
            ux_designs = [
                design for design in repo.list_by_type(DesignTypeEnum.UX_DESIGN)[:5]
                if design.file_size < 2 * 1024 * 1024 and design.content_type.startswith("image/")
            ][:3]  # Limit to 3 UX designs max
            
            return {
                "logos": logos,  # Return full Design objects with file_data
                "ux_designs": ux_designs,  # Return full Design objects with file_data for visual inspiration
            }
        except Exception as e:
            logger.warning(f"Failed to fetch designs for LLM: {e}")
            return {"logos": [], "ux_designs": []}

    def _prepare_ui_generation_context(
        self,
        widget_id: str,
        project_id: str,
        tools: list[ToolResponse],
        user_message: str
    ) -> tuple[str | None, dict[str, Any], str, str]:
        """
        Common preparation for UI generation (retrieve existing UI, fetch designs, build prompts).
        
        Returns:
            Tuple of (existing_html, designs, system_prompt, user_content)
        """
        # Retrieve existing UI resource if available
        existing_ui = None
        from app.db.storage.ui_widget_resource_repository import (
            UiWidgetResourceRepository,
        )
        resource_repo = UiWidgetResourceRepository()
        latest_resource = resource_repo.get_latest_by_widget_id(widget_id, project_id)
        if latest_resource and latest_resource.resource:
            existing_ui = latest_resource.resource
            logger.debug(f"Found existing UI resource for widget {widget_id}")
        existing_html = extract_html_from_ui_resource(existing_ui)
        designs = self._fetch_designs_for_llm()
        
        system_prompt = build_ui_generation_system_prompt(
            tools=tools,
            user_message=user_message,
            has_existing_ui=existing_html is not None,
            designs=designs,
        )

        user_content = build_ui_generation_user_message(
            user_message=user_message
        )

        return existing_html, designs, system_prompt, user_content

    def _process_ui_generation_response(
        self,
        raw_html: str,
        finish_reason: str | None
    ) -> dict[str, Any]:
        """
        Common post-processing for UI generation (extract, clean, validate HTML).
        
        Args:
            raw_html: Raw HTML from LLM response
            finish_reason: Finish reason from API response
            input_tokens: Input token count
            output_tokens: Output token count
        
        Returns:
            Dictionary with html_content key, or None if processing fails
        """
        html_content = self._extract_clean_html(raw_html)
        validation_errors = self._validate_generated_html(html_content)
        if validation_errors:
            logger.warning(f"HTML validation found issues: {validation_errors}")
        if (finish_reason != "stop") or self._is_html_incomplete(html_content):
            logger.error(
                f"🚨 INCOMPLETE HTML DETECTED - The generated HTML may be truncated. "
                "Check logs above for token usage and consider increasing max_tokens."
            )
            logger.error(
                f"💡 SOLUTION: Increase LLM_UI_MAX_TOKENS environment variable (currently: {self.max_ui_tokens})"
            )
        return {"html_content": html_content}

    def _generate_ui_resource(
        self,
        widget_id: str,
        project_id: str,
        tools: list[ToolResponse],
        user_message: str,
        previous_messages: list[Message],
    ) -> dict[str, Any]:
        """
        Generate UI resource based on the tools and conversation context.
        
        Args:
            widget_id: The ID of the widget (used to retrieve existing UI)
            project_id: The ID of the project
            tools: The list of tool objects containing tool information
            user_message: User's current message
            previous_messages: Previous messages in the conversation
        
        Returns:
            UI resource dictionary
        """
        existing_html, designs, system_prompt, user_content = self._prepare_ui_generation_context(
            widget_id=widget_id, project_id=project_id, tools=tools, user_message=user_message)
        
        message_content: list[dict[str, Any]] = [{"type": "text", "text": user_content}]
        if existing_html:
            message_content.append({"type": "text", "text": f"\n\n<existing_html>\n{existing_html}\n</existing_html>"})

        logos = designs.get("logos", [])
        if logos:
            logger.debug(f"Including {len(logos)} logo image(s) in LLM message for visual inspiration")
            for logo in logos:
                try:
                    base64_data = base64.b64encode(logo.file_data).decode('utf-8')
                    message_content.append({
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{logo.content_type};base64,{base64_data}"
                        }
                    })
                    logger.debug(f"Added logo image: {logo.filename} ({logo.content_type}, {logo.file_size} bytes)")
                except Exception as e:
                    logger.warning(f"Failed to encode logo {logo.id} for LLM API: {e}")
        
        ux_designs = designs.get("ux_designs", [])
        if ux_designs:
            logger.debug(f"Including {len(ux_designs)} UX design image(s) in LLM message for visual inspiration")
            for ux_design in ux_designs:
                try:
                    base64_data = base64.b64encode(ux_design.file_data).decode('utf-8')
                    message_content.append({
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{ux_design.content_type};base64,{base64_data}"
                        }
                    })
                    logger.debug(f"Added UX design image: {ux_design.filename} ({ux_design.content_type}, {ux_design.file_size} bytes)")
                except Exception as e:
                    logger.warning(f"Failed to encode UX design {ux_design.id} for LLM API: {e}")
        
        try:
            logger.debug(f"Existing HTML present: {existing_html is not None}, Length: {len(existing_html) if existing_html else 0}")
            total_images = len(logos) + len(ux_designs)
            logger.debug(f"Message content blocks: {len(message_content)} (1 text + {total_images} images: {len(logos)} logos + {len(ux_designs)} UX designs)")
            messages = []
            for message in previous_messages[:-1]:
                messages.append({"role": message.role.value, "content": message.content})
            messages.append({"role": "user", "content": message_content})
            raw_html, usage_info = self.llm_client.call(
                messages=messages,
                system=system_prompt,
                temperature=self.ui_generation_temperature,
                max_tokens=self.max_ui_tokens,
            )

            return self._process_ui_generation_response(
                raw_html=raw_html,
                finish_reason=usage_info.get("finish_reason")
            )
        except Exception as e:
            logger.error(f"LLM UI generation error: {e}", exc_info=True)
            return None

    def _extract_clean_html(self, raw_text: str) -> str:
        """
        Extract clean HTML from LLM response.
        
        Handles cases where LLM might:
        - Wrap HTML in markdown code blocks (```html ... ```)
        - Add explanatory text before/after HTML
        - Include extra formatting
        
        Args:
            raw_text: Raw text from LLM response
        
        Returns:
            Clean HTML starting with <!DOCTYPE html> or <html> and ending with </html>
        """
        if not raw_text:
            return ""
        
        # Remove markdown code blocks
        import re

        # Pattern to match markdown code blocks (```html ... ``` or ``` ... ```)
        code_block_pattern = r'```(?:html)?\s*\n?(.*?)\n?```'
        matches = re.findall(code_block_pattern, raw_text, re.DOTALL)
        if matches:
            # If code blocks found, use the content inside
            raw_text = matches[-1]  # Use the last match (usually the main HTML)
        
        # Find HTML content - look for <!DOCTYPE html> or <html>
        html_start_patterns = [
            r'<!DOCTYPE\s+html[^>]*>',
            r'<html[^>]*>',
        ]
        
        html_start = -1
        for pattern in html_start_patterns:
            match = re.search(pattern, raw_text, re.IGNORECASE)
            if match:
                html_start = match.start()
                break
        
        if html_start == -1:
            # No HTML tag found, try to find any HTML-like content
            logger.warning("No HTML tag found in LLM response, attempting to extract anyway")
            html_start = 0
        
        # Find the closing </html> tag
        html_end = raw_text.rfind('</html>')
        if html_end == -1:
            # No closing tag found
            logger.warning("No closing </html> tag found in LLM response")
            # Try to find last > tag as fallback
            last_gt = raw_text.rfind('>')
            if last_gt != -1:
                html_end = last_gt + 1
            else:
                html_end = len(raw_text)
        else:
            html_end += len('</html>')
        
        # Extract the HTML portion
        html_content = raw_text[html_start:html_end].strip()
        
        # Additional cleanup: remove any leading/trailing text that's not HTML
        # Remove any text before first < character
        first_lt = html_content.find('<')
        if first_lt > 0:
            html_content = html_content[first_lt:]
        
        # Ensure it starts with <!DOCTYPE html> or <html>
        if not html_content.lower().startswith('<!doctype') and not html_content.lower().startswith('<html'):
            logger.warning("Extracted content doesn't start with HTML tag, prepending <!DOCTYPE html>")
            html_content = '<!DOCTYPE html>\n' + html_content
        
        # Ensure it ends with </html>
        if not html_content.rstrip().endswith('</html>'):
            logger.warning("Extracted content doesn't end with </html>, appending closing tag")
            html_content = html_content.rstrip() + '\n</html>'
        
        logger.debug(f"HTML extraction: start={html_start}, end={html_end}, final_length={len(html_content)}")
        
        return html_content

    def _validate_generated_html(self, html_content: str) -> list[str]:
        """
        Validate generated HTML for common structural issues.
        
        Args:
            html_content: The generated HTML content to validate
            
        Returns:
            List of validation error messages (empty if no issues found)
        """
        import re
        errors = []
        
        if not html_content:
            return ["HTML content is empty"]
        
        # Check for required HTML structure
        html_lower = html_content.lower()
        required_tags = [
            ("<!doctype html>", "Missing DOCTYPE declaration"),
            ("<html", "Missing <html> tag"),
            ("</html>", "Missing closing </html> tag"),
            ("<head", "Missing <head> tag"),
            ("</head>", "Missing closing </head> tag"),
            ("<body", "Missing <body> tag"),
            ("</body>", "Missing closing </body> tag"),
            ('id="root"', "Missing <div id='root'> for React mounting"),
            ("reactdom.render", "Missing ReactDOM.render() call"),
        ]
        
        for tag_pattern, error_msg in required_tags:
            if tag_pattern not in html_lower:
                errors.append(error_msg)
        
        # Check for balanced HTML tags (simplified check)
        # Count opening vs closing tags for common elements
        tag_pairs = [
            ("div", "</div>"),
            ("style", "</style>"),
        ]
        
        for tag_name, close_tag in tag_pairs:
            # Count self-closing and opening tags
            open_pattern = rf"<{tag_name}[^>]*>"
            open_matches = re.findall(open_pattern, html_content, re.IGNORECASE)
            # Filter out self-closing tags
            open_count = len([m for m in open_matches if not m.rstrip().endswith('/>')])
            close_count = html_content.lower().count(close_tag)
            if open_count != close_count:
                errors.append(f"Unbalanced <{tag_name}>/{close_tag} tags: {open_count} opening, {close_count} closing")
        
        # Check for React CDN scripts
        if "unpkg.com/react" not in html_content.lower():
            errors.append("Missing React CDN script")
        if "unpkg.com/react-dom" not in html_content.lower():
            errors.append("Missing ReactDOM CDN script")
        if "unpkg.com/@babel/standalone" not in html_content.lower():
            errors.append("Missing Babel standalone script for JSX transformation")
        
        # Check for common JSX syntax issues
        # Look for unclosed JSX expressions
        jsx_expressions = re.findall(r'\{[^}]*$', html_content, re.MULTILINE)
        if jsx_expressions:
            errors.append(f"Found {len(jsx_expressions)} potentially unclosed JSX expressions")
        
        # Check for balanced braces in script sections
        script_sections = re.findall(r'<script[^>]*>(.*?)</script>', html_content, re.DOTALL | re.IGNORECASE)
        for script_content in script_sections:
            open_braces = script_content.count('{')
            close_braces = script_content.count('}')
            if open_braces != close_braces:
                errors.append(f"Unbalanced braces in script section: {open_braces} opening, {close_braces} closing")
            
            open_parens = script_content.count('(')
            close_parens = script_content.count(')')
            if open_parens != close_parens:
                errors.append(f"Unbalanced parentheses in script section: {open_parens} opening, {close_parens} closing")
        
        # Check if script tag is properly closed
        script_tag_count = len(re.findall(r'<script', html_content, re.IGNORECASE))
        script_close_count = html_content.lower().count('</script>')
        if script_tag_count != script_close_count:
            errors.append(f"Unbalanced script tags: {script_tag_count} opening, {script_close_count} closing")
        
        return errors

    def _is_html_incomplete(self, html_content: str) -> bool:
        """
        Detect if HTML appears incomplete (truncated).
        
        Checks for signs that the HTML was cut off:
        - Missing closing </html> tag
        - Script tags not properly closed
        - React component not properly closed
        - Missing ReactDOM.render call
        
        Args:
            html_content: The HTML content to check
            
        Returns:
            True if HTML appears incomplete, False otherwise
        """
        if not html_content:
            return True
        
        html_lower = html_content.lower().strip()
        
        # Must end with </html>
        if not html_lower.endswith('</html>'):
            return True
        
        # Must have ReactDOM.render
        if 'reactdom.render' not in html_lower:
            return True
        
        # Check for incomplete script tags
        script_open_count = html_lower.count('<script')
        script_close_count = html_lower.count('</script>')
        if script_open_count > 0 and script_open_count != script_close_count:
            return True
        
        # Check if ends abruptly (common truncation patterns)
        # If it ends with incomplete JSX or function
        last_200 = html_content[-200:].strip()
        
        # Check for incomplete expressions
        incomplete_patterns = [
            r'\{[^}]*$',  # Unclosed JSX expression
            r'\([^)]*$',   # Unclosed function call
            r'\[[^\]]*$', # Unclosed array
            r'\{[^}]*$',   # Unclosed object
        ]
        
        for pattern in incomplete_patterns:
            if re.search(pattern, last_200):
                return True
        
        return False

    def _clean_html_from_text(self, text: str) -> str:
        """
        Clean HTML tags from text responses while preserving Markdown formatting.
        
        This is a safety measure to ensure HTML doesn't leak into text responses.
        HTML should only be in UI resources, never in text responses.
        Markdown formatting is preserved for frontend rendering.
        
        Args:
            text: Text that might contain HTML
            
        Returns:
            Cleaned text with HTML removed but Markdown preserved
        """
        if not text:
            return text
        
        # Remove HTML tags (but preserve Markdown)
        text = re.sub(r'<[^>]+>', '', text)
        
        # Remove HTML script and style blocks entirely
        text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
        
        # Convert common HTML entities to plain text
        html_entities = {
            '&lt;': '<',
            '&gt;': '>',
            '&amp;': '&',
            '&quot;': '"',
            '&#39;': "'",
            '&nbsp;': ' ',
            '&mdash;': '—',
            '&ndash;': '–',
        }
        for entity, replacement in html_entities.items():
            text = text.replace(entity, replacement)
        
        # Clean up extra whitespace but preserve Markdown structure
        text = re.sub(r'\n{3,}', '\n\n', text)  # Multiple newlines -> double newline (preserve Markdown spacing)
        text = text.strip()
        
        # Note: Markdown code blocks (```) and other Markdown syntax are preserved
        # This allows the frontend to render Markdown properly
        
        return text
