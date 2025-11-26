"""Repository for toolkit database operations."""
from typing import Any

from app.db.db_client import DbClient, db
from app.db.models.tools import Toolkit
from app.server.exceptions import NotFoundError


class ToolkitRepository:
    """Repository for toolkit database operations."""

    TABLE_NAME = "toolkit"

    def __init__(self, db_client: DbClient | None = None):
        """Initialize with database client."""
        self._db = db_client or db

    def create(self, toolkit_data: Toolkit) -> Toolkit:
        """Create a new toolkit in the database."""
        data = toolkit_data.model_dump(
            exclude_none=True,
            exclude={"created_at", "updated_at"},
            mode="json",
        )
        
        project_id = data["project_id"]
        
        query = """
            INSERT INTO toolkit (id, name, toolkit_source_id, description, project_id)
            VALUES (%(id)s, %(name)s, %(toolkit_source_id)s, %(description)s, %(project_id)s)
            RETURNING *
        """
        
        params = {
            "id": data["id"],
            "name": data["name"],
            "toolkit_source_id": data["toolkit_source_id"],
            "description": data.get("description"),
            "project_id": project_id,
        }
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise ValueError("Failed to create toolkit")
        
        return Toolkit(**result)

    def get_by_id(self, toolkit_id: str, project_id: str) -> Toolkit:
        """Get a toolkit by ID for a specific project."""
        query = "SELECT * FROM toolkit WHERE id = %s AND project_id = %s"
        result = self._db.execute_fetchone(query, (toolkit_id, project_id))
        
        if not result:
            raise NotFoundError(detail=f"Toolkit with ID '{toolkit_id}' not found")
        
        return Toolkit(**result)

    def list_all(self, project_id: str) -> list[Toolkit]:
        """List all toolkits for a specific project."""
        query = "SELECT * FROM toolkit WHERE project_id = %s ORDER BY created_at DESC"
        results = self._db.execute_fetchall(query, (project_id,))
        
        return [Toolkit(**row) for row in results]

    def update(self, toolkit_id: str, update_data: dict[str, Any], project_id: str) -> Toolkit:
        """Update a toolkit for a specific project."""
        # Remove updated_at from manual update - it's handled by database trigger
        update_data = {k: v for k, v in update_data.items() if k != "updated_at"}
        
        if not update_data:
            raise ValueError("No fields to update")
        
        # Whitelist allowed columns to prevent SQL injection
        allowed_columns = {"name", "description"}
        update_data = {k: v for k, v in update_data.items() if k in allowed_columns}
        
        if not update_data:
            raise ValueError("No valid fields to update")
        
        # Build dynamic UPDATE query
        set_clauses = []
        params: dict[str, Any] = {"id": toolkit_id, "project_id": project_id}
        
        for key, value in update_data.items():
            set_clauses.append(f"{key} = %({key})s")
            params[key] = value
        
        where_clause = "WHERE id = %(id)s AND project_id = %(project_id)s"
        query = f"""
            UPDATE toolkit
            SET {', '.join(set_clauses)}
            {where_clause}
            RETURNING *
        """
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise NotFoundError(detail=f"Toolkit with ID '{toolkit_id}' not found")
        
        return Toolkit(**result)

    def delete(self, toolkit_id: str, project_id: str) -> bool:
        """Delete a toolkit for a specific project."""
        query = "DELETE FROM toolkit WHERE id = %s AND project_id = %s RETURNING id"
        with self._db.transaction():
            result = self._db.execute_fetchone(query, (toolkit_id, project_id))
        
        return result is not None

    def count_tools_in_toolkit(self, toolkit_id: str, project_id: str) -> int:
        """Count how many tools are in this toolkit for a specific project."""
        query = "SELECT COUNT(*) as count FROM tool WHERE toolkit_id = %s AND project_id = %s"
        result = self._db.execute_fetchval(query, (toolkit_id, project_id))
        
        return result or 0

