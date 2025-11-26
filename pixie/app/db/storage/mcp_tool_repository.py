"""Repository for MCP-compliant tool database operations."""
import json
from typing import Any

from app.db.db_client import DbClient, db
from app.db.models.tools import Tool
from app.server.exceptions import NotFoundError


class McpToolRepository:
    """Repository for MCP-compliant tool database operations."""

    TABLE_NAME = "tool"

    def __init__(self, db_client: DbClient | None = None):
        """Initialize with database client."""
        self._db = db_client or db

    def create(self, tool_data: Tool) -> Tool:
        """Create a new tool in the database."""
        data = tool_data.model_dump(
            exclude_none=True,
            exclude={"created_at", "updated_at"},
            mode="json",
        )
        
        # Convert inputSchema/outputSchema to input_schema/output_schema and serialize to JSON
        input_schema_json = json.dumps(data["inputSchema"])
        output_schema_json = json.dumps(data["outputSchema"]) if data.get("outputSchema") else None
        annotations_json = json.dumps(data["annotations"]) if data.get("annotations") else None
        
        project_id = data["project_id"]
        
        query = """
            INSERT INTO tool (
                id, toolkit_id, name, title, description,
                input_schema, output_schema, annotations, is_enabled, project_id
            )
            VALUES (
                %(id)s, %(toolkit_id)s, %(name)s, %(title)s, %(description)s,
                %(input_schema)s::jsonb, %(output_schema)s::jsonb, %(annotations)s::jsonb, %(is_enabled)s, %(project_id)s
            )
            RETURNING *
        """
        
        params = {
            "id": data["id"],
            "toolkit_id": data["toolkit_id"],
            "name": data["name"],
            "title": data.get("title"),
            "description": data["description"],
            "input_schema": input_schema_json,
            "output_schema": output_schema_json,
            "annotations": annotations_json,
            "is_enabled": data.get("is_enabled", True),
            "project_id": project_id,
        }
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise ValueError("Failed to create tool")
        
        return self._convert_db_to_model(result)

    def get_by_id(self, tool_id: str, project_id: str) -> Tool:
        """Get a tool by ID for a specific project."""
        query = "SELECT * FROM tool WHERE id = %s AND project_id = %s"
        result = self._db.execute_fetchone(query, (tool_id, project_id))
        
        if not result:
            raise NotFoundError(detail=f"Tool with ID '{tool_id}' not found")
        
        return self._convert_db_to_model(result)

    def list_by_toolkit(self, toolkit_id: str, project_id: str) -> list[Tool]:
        """List all tools in a toolkit for a specific project."""
        query = "SELECT * FROM tool WHERE toolkit_id = %s AND project_id = %s ORDER BY created_at DESC"
        results = self._db.execute_fetchall(query, (toolkit_id, project_id))
        
        return [self._convert_db_to_model(row) for row in results]

    def list_all(self, project_id: str) -> list[Tool]:
        """List all tools for a specific project."""
        query = "SELECT * FROM tool WHERE project_id = %s ORDER BY created_at DESC"
        results = self._db.execute_fetchall(query, (project_id,))
        
        return [self._convert_db_to_model(row) for row in results]

    def update(self, tool_id: str, update_data: dict[str, Any], project_id: str) -> Tool:
        """Update a tool for a specific project."""
        # Remove updated_at from manual update - it's handled by database trigger
        update_data = {k: v for k, v in update_data.items() if k != "updated_at"}
        
        if not update_data:
            raise ValueError("No fields to update")
        
        # Whitelist allowed columns to prevent SQL injection
        allowed_columns = {"name", "title", "description", "inputSchema", "outputSchema", "annotations"}
        update_data = {k: v for k, v in update_data.items() if k in allowed_columns}
        
        if not update_data:
            raise ValueError("No valid fields to update")
        
        # Convert inputSchema/outputSchema to input_schema/output_schema and serialize to JSON
        if "inputSchema" in update_data:
            update_data["input_schema"] = json.dumps(update_data.pop("inputSchema"))
        if "outputSchema" in update_data:
            if update_data["outputSchema"] is not None:
                update_data["output_schema"] = json.dumps(update_data.pop("outputSchema"))
            else:
                update_data["output_schema"] = None
                update_data.pop("outputSchema", None)
        if "annotations" in update_data:
            if update_data["annotations"] is not None:
                update_data["annotations"] = json.dumps(update_data.pop("annotations"))
            else:
                update_data["annotations"] = None
        
        # Build dynamic UPDATE query
        set_clauses = []
        params: dict[str, Any] = {"id": tool_id, "project_id": project_id}
        
        for key, value in update_data.items():
            if key in ("input_schema", "output_schema", "annotations") and value is not None:
                set_clauses.append(f"{key} = %({key})s::jsonb")
            else:
                set_clauses.append(f"{key} = %({key})s")
            params[key] = value
        
        query = f"""
            UPDATE tool
            SET {', '.join(set_clauses)}
            WHERE id = %(id)s AND project_id = %(project_id)s
            RETURNING *
        """
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise NotFoundError(detail=f"Tool with ID '{tool_id}' not found")
        
        return self._convert_db_to_model(result)

    def delete(self, tool_id: str, project_id: str) -> bool:
        """Delete a tool for a specific project."""
        query = "DELETE FROM tool WHERE id = %s AND project_id = %s RETURNING id"
        with self._db.transaction():
            result = self._db.execute_fetchone(query, (tool_id, project_id))
        
        return result is not None

    def update_enabled_status(self, tool_id: str, is_enabled: bool, project_id: str) -> Tool:
        """Update the enabled status of a tool for a specific project."""
        query = f"""
            UPDATE tool
            SET is_enabled = %(is_enabled)s
            WHERE id = %(id)s AND project_id = %(project_id)s
            RETURNING *
        """
        
        params = {"id": tool_id, "is_enabled": is_enabled, "project_id": project_id}
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise NotFoundError(detail=f"Tool with ID '{tool_id}' not found")
        
        return self._convert_db_to_model(result)

    def _convert_db_to_model(self, db_row: dict[str, Any]) -> Tool:
        """Convert database row to Tool model (converting snake_case to camelCase)."""
        # Convert input_schema/output_schema to inputSchema/outputSchema
        # Parse JSON strings to dicts
        if "input_schema" in db_row:
            input_schema = db_row.pop("input_schema")
            if isinstance(input_schema, str):
                db_row["inputSchema"] = json.loads(input_schema)
            else:
                db_row["inputSchema"] = input_schema
        
        if "output_schema" in db_row:
            output_schema = db_row.pop("output_schema")
            if output_schema is not None:
                if isinstance(output_schema, str):
                    db_row["outputSchema"] = json.loads(output_schema)
                else:
                    db_row["outputSchema"] = output_schema
            else:
                db_row["outputSchema"] = None
        
        if "annotations" in db_row and db_row["annotations"] is not None:
            if isinstance(db_row["annotations"], str):
                db_row["annotations"] = json.loads(db_row["annotations"])
        
        return Tool(**db_row)

