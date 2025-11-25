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
        
        query = """
            INSERT INTO toolkit (id, name, toolkit_source_id, description)
            VALUES (%(id)s, %(name)s, %(toolkit_source_id)s, %(description)s)
            RETURNING *
        """
        
        params = {
            "id": data["id"],
            "name": data["name"],
            "toolkit_source_id": data["toolkit_source_id"],
            "description": data.get("description"),
        }
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise ValueError("Failed to create toolkit")
        
        return Toolkit(**result)

    def get_by_id(self, toolkit_id: str) -> Toolkit:
        """Get a toolkit by ID."""
        query = "SELECT * FROM toolkit WHERE id = %s"
        
        result = self._db.execute_fetchone(query, (toolkit_id,))
        
        if not result:
            raise NotFoundError(detail=f"Toolkit with ID '{toolkit_id}' not found")
        
        return Toolkit(**result)

    def list_all(self) -> list[Toolkit]:
        """List all toolkits."""
        query = "SELECT * FROM toolkit ORDER BY created_at DESC"
        
        results = self._db.execute_fetchall(query)
        
        return [Toolkit(**row) for row in results]

    def update(self, toolkit_id: str, update_data: dict[str, Any]) -> Toolkit:
        """Update a toolkit."""
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
        params: dict[str, Any] = {"id": toolkit_id}
        
        for key, value in update_data.items():
            set_clauses.append(f"{key} = %({key})s")
            params[key] = value
        
        query = f"""
            UPDATE toolkit
            SET {', '.join(set_clauses)}
            WHERE id = %(id)s
            RETURNING *
        """
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise NotFoundError(detail=f"Toolkit with ID '{toolkit_id}' not found")
        
        return Toolkit(**result)

    def delete(self, toolkit_id: str) -> bool:
        """Delete a toolkit."""
        query = "DELETE FROM toolkit WHERE id = %s RETURNING id"
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, (toolkit_id,))
        
        return result is not None

    def count_tools_in_toolkit(self, toolkit_id: str) -> int:
        """Count how many tools are in this toolkit."""
        query = "SELECT COUNT(*) as count FROM tool WHERE toolkit_id = %s"
        
        result = self._db.execute_fetchval(query, (toolkit_id,))
        
        return result or 0

