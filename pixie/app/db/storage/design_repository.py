"""Repository for design database operations."""
from typing import Any

from app.db.db_client import DbClient, db
from app.db.models.designs import Design, DesignTypeEnum
from app.server.exceptions import NotFoundError


class DesignRepository:
    """Repository for design database operations."""

    TABLE_NAME = "design"

    def __init__(self, db_client: DbClient | None = None):
        """Initialize with database client."""
        self._db = db_client or db

    def create(self, design_data: Design) -> Design:
        """Create a new design in the database."""
        # Don't use mode="json" since we have bytes data
        query = """
            INSERT INTO design (id, design_type, filename, content_type, file_data, file_size, project_id)
            VALUES (%(id)s, %(design_type)s, %(filename)s, %(content_type)s, %(file_data)s, %(file_size)s, %(project_id)s)
            RETURNING *
        """
        params = {
            "id": design_data.id,
            "design_type": design_data.design_type.value,
            "filename": design_data.filename,
            "content_type": design_data.content_type,
            "file_data": design_data.file_data,
            "file_size": design_data.file_size,
            "project_id": design_data.project_id,
        }
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise ValueError("Failed to create design")
        
        return Design(**result)

    def get_by_id(self, design_id: str, project_id: str) -> Design:
        """Get a design by ID for a specific project."""
        query = "SELECT * FROM design WHERE id = %s AND project_id = %s"
        result = self._db.execute_fetchone(query, (design_id, project_id))
        
        if not result:
            raise NotFoundError(detail=f"Design with ID '{design_id}' not found")
        
        return Design(**result)

    def list_all(self, project_id: str) -> list[Design]:
        """List all designs for a specific project."""
        query = "SELECT * FROM design WHERE project_id = %s ORDER BY created_at DESC"
        results = self._db.execute_fetchall(query, (project_id,))
        
        return [Design(**row) for row in results]

    def list_by_type(self, design_type: DesignTypeEnum, project_id: str) -> list[Design]:
        """List designs by type for a specific project."""
        query = "SELECT * FROM design WHERE design_type = %s AND project_id = %s ORDER BY created_at DESC"
        results = self._db.execute_fetchall(query, (design_type.value, project_id))
        
        return [Design(**row) for row in results]

    def list_paginated(self, project_id: str, design_type: DesignTypeEnum | None = None, limit: int = 20, offset: int = 0) -> list[Design]:
        """List designs with pagination, optionally filtered by type and (required) project_id when provided."""
        conditions = []
        params: dict[str, Any] = {
            "limit": limit,
            "offset": offset,
        }
        
        if design_type:
            conditions.append("design_type = %(design_type)s")
            params["design_type"] = design_type.value
        
        if project_id is not None:
            conditions.append("project_id = %(project_id)s")
            params["project_id"] = project_id
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        query = f"""
            SELECT * FROM design 
            {where_clause}
            ORDER BY created_at DESC 
            LIMIT %(limit)s OFFSET %(offset)s
        """
        
        results = self._db.execute_fetchall(query, params)
        
        return [Design(**row) for row in results]

    def count(self, project_id: str, design_type: DesignTypeEnum | None = None) -> int:
        """Count total number of designs, optionally filtered by type and (required) project_id when provided."""
        params: dict[str, Any] = {"project_id": project_id}
        
        query = "SELECT COUNT(*) as count FROM design WHERE project_id = %(project_id)s"
        if design_type:
            query += " AND design_type = %(design_type)s"
            params["design_type"] = design_type.value
        
        result = self._db.execute_fetchval(query, params)
        
        return result or 0

    def update(self, design_id: str, update_data: dict[str, Any], project_id: str) -> Design:
        """Update a design for a specific project."""
        # Remove updated_at from manual update - it's handled by database trigger
        update_data = {k: v for k, v in update_data.items() if k != "updated_at"}
        
        if not update_data:
            raise ValueError("No fields to update")
        
        # Whitelist allowed columns to prevent SQL injection
        allowed_columns = {"filename", "content_type", "file_data", "file_size"}
        update_data = {k: v for k, v in update_data.items() if k in allowed_columns}
        
        if not update_data:
            raise ValueError("No valid fields to update")
        
        # Build dynamic UPDATE query
        set_clauses = []
        params: dict[str, Any] = {"id": design_id, "project_id": project_id}
        
        for key, value in update_data.items():
            set_clauses.append(f"{key} = %({key})s")
            params[key] = value
        
        where_clause = "WHERE id = %(id)s AND project_id = %(project_id)s"
        query = f"""
            UPDATE design
            SET {', '.join(set_clauses)}
            {where_clause}
            RETURNING *
        """
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise NotFoundError(detail=f"Design with ID '{design_id}' not found")
        
        return Design(**result)

    def delete(self, design_id: str, project_id: str) -> bool:
        """Delete a design for a specific project."""
        query = "DELETE FROM design WHERE id = %s AND project_id = %s RETURNING id"
        with self._db.transaction():
            result = self._db.execute_fetchone(query, (design_id, project_id))
        
        return result is not None

