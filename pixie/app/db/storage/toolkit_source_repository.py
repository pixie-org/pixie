"""Repository for toolkit source database operations."""
import json
from typing import Any

from app.db.db_client import DbClient, db
from app.db.models.tools import ToolkitSource, ToolSourceType
from app.server.exceptions import NotFoundError


class ToolkitSourceRepository:
    """Repository for toolkit source database operations."""

    TABLE_NAME = "toolkit_source"

    def __init__(self, db_client: DbClient | None = None):
        """Initialize with database client."""
        self._db = db_client or db

    def create(self, toolkit_source_data: ToolkitSource) -> ToolkitSource:
        """Create a new toolkit source in the database."""
        data = toolkit_source_data.model_dump(
            exclude_none=True,
            exclude={"created_at", "updated_at"},
            mode="json",
        )
        
        # Convert configuration to JSON string
        config_json = json.dumps(data["configuration"])
        source_type = data["source_type"].value if isinstance(data["source_type"], ToolSourceType) else data["source_type"]
        
        query = """
            INSERT INTO toolkit_source (id, name, source_type, description, configuration, project_id)
            VALUES (%(id)s, %(name)s, %(source_type)s, %(description)s, %(configuration)s::jsonb, %(project_id)s)
            RETURNING *
        """
        
        params = {
            "id": data["id"],
            "name": data["name"],
            "source_type": source_type,
            "description": data.get("description"),
            "configuration": config_json,
            "project_id": data["project_id"],
        }
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise ValueError("Failed to create toolkit source")
        
        # Parse configuration JSON back to dict if needed
        # psycopg with dict_row should return JSONB as dict, but handle string case
        if isinstance(result["configuration"], str):
            result["configuration"] = json.loads(result["configuration"])
        
        return ToolkitSource(**result)

    def get_by_id(self, toolkit_source_id: str, project_id: str) -> ToolkitSource:
        """Get a toolkit source by ID for a specific project."""
        query = "SELECT * FROM toolkit_source WHERE id = %s AND project_id = %s"
        result = self._db.execute_fetchone(query, (toolkit_source_id, project_id))
        
        if not result:
            raise NotFoundError(
                detail=f"Toolkit source with ID '{toolkit_source_id}' not found"
            )
        
        # Parse configuration JSON back to dict if needed
        # psycopg with dict_row should return JSONB as dict, but handle string case
        if isinstance(result["configuration"], str):
            result["configuration"] = json.loads(result["configuration"])
        
        return ToolkitSource(**result)

    def list_all(self, project_id: str) -> list[ToolkitSource]:
        """List all toolkit sources for a specific project."""
        query = "SELECT * FROM toolkit_source WHERE project_id = %s ORDER BY created_at DESC"
        results = self._db.execute_fetchall(query, (project_id,))
        
        # Parse configuration JSON back to dict if needed
        # psycopg with dict_row should return JSONB as dict, but handle string case
        for row in results:
            if isinstance(row["configuration"], str):
                row["configuration"] = json.loads(row["configuration"])
        
        return [ToolkitSource(**row) for row in results]

    def delete(self, toolkit_source_id: str, project_id: str) -> bool:
        """Delete a toolkit source for a specific project."""
        query = "DELETE FROM toolkit_source WHERE id = %s AND project_id = %s RETURNING id"
        with self._db.transaction():
            result = self._db.execute_fetchone(query, (toolkit_source_id, project_id))
        
        return result is not None

    def count_toolkits_using_source(self, toolkit_source_id: str, project_id: str) -> int:
        """Count how many toolkits are using this toolkit source for a specific project."""
        query = "SELECT COUNT(*) as count FROM toolkit WHERE toolkit_source_id = %s AND project_id = %s"
        result = self._db.execute_fetchval(query, (toolkit_source_id, project_id))
        
        return result or 0

