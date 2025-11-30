"""Tool schema inference module for inferring JSON Schema from tool outputs."""
import json
import logging
from typing import Any

from app.api.core.llm_client import LLMClient
from app.api.core.prompts import build_output_schema_inference_prompt

logger = logging.getLogger(__name__)


def infer_output_schema(
    tool_name: str,
    tool_description: str,
    tool_output: Any,
) -> dict[str, Any]:
    """
    Infer JSON Schema from tool output using LLM.
    
    Args:
        tool_name: Name of the tool
        tool_description: Description of the tool
        tool_output: The actual output from the tool call
        
    Returns:
        Inferred JSON Schema dictionary
    """
    llm_client = LLMClient()
    
    system_prompt = build_output_schema_inference_prompt(
        tool_name=tool_name,
        tool_description=tool_description,
        tool_output=tool_output,
    )

    try:
        messages = [
            {"role": "user", "content": system_prompt}
        ]
        response_text, _ = llm_client.call(
            messages=messages,
            system="You are a JSON Schema expert. Return only valid JSON.",
            temperature=0.1,
            max_tokens=2000,
        )
        
        # Extract JSON from markdown code blocks if present
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        schema = json.loads(response_text)
        return schema
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse inferred schema as JSON: {e}")
        return {
            "type": "object",
            "description": "Schema inference failed. Please review the tool output manually.",
        }
    except Exception as e:
        logger.error(f"Schema inference error: {e}", exc_info=True)
        return {
            "type": "object",
            "description": f"Schema inference failed: {str(e)}",
        }
