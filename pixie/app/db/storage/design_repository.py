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
            INSERT INTO design (id, design_type, filename, content_type, file_data, file_size)
            VALUES (%(id)s, %(design_type)s, %(filename)s, %(content_type)s, %(file_data)s, %(file_size)s)
            RETURNING *
        """
        params = {
            "id": design_data.id,
            "design_type": design_data.design_type.value,
            "filename": design_data.filename,
            "content_type": design_data.content_type,
            "file_data": design_data.file_data,
            "file_size": design_data.file_size,
        }
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise ValueError("Failed to create design")
        
        return Design(**result)

    def get_by_id(self, design_id: str) -> Design:
        """Get a design by ID."""
        query = "SELECT * FROM design WHERE id = %s"
        
        result = self._db.execute_fetchone(query, (design_id,))
        
        if not result:
            raise NotFoundError(detail=f"Design with ID '{design_id}' not found")
        
        return Design(**result)

    def list_all(self) -> list[Design]:
        """List all designs."""
        query = "SELECT * FROM design ORDER BY created_at DESC"
        
        results = self._db.execute_fetchall(query)
        
        return [Design(**row) for row in results]

    def list_by_type(self, design_type: DesignTypeEnum) -> list[Design]:
        """List designs by type."""
        query = "SELECT * FROM design WHERE design_type = %s ORDER BY created_at DESC"
        
        results = self._db.execute_fetchall(query, (design_type.value,))
        
        return [Design(**row) for row in results]

    def list_paginated(self, limit: int = 20, offset: int = 0, design_type: DesignTypeEnum | None = None) -> list[Design]:
        """List designs with pagination, optionally filtered by type."""
        if design_type:
            query = """
                SELECT * FROM design 
                WHERE design_type = %(design_type)s
                ORDER BY created_at DESC 
                LIMIT %(limit)s OFFSET %(offset)s
            """
            params = {
                "design_type": design_type.value,
                "limit": limit,
                "offset": offset,
            }
        else:
            query = """
                SELECT * FROM design 
                ORDER BY created_at DESC 
                LIMIT %(limit)s OFFSET %(offset)s
            """
            params = {
                "limit": limit,
                "offset": offset,
            }
        
        results = self._db.execute_fetchall(query, params)
        
        return [Design(**row) for row in results]

    def count(self, design_type: DesignTypeEnum | None = None) -> int:
        """Count total number of designs, optionally filtered by type."""
        if design_type:
            query = "SELECT COUNT(*) as count FROM design WHERE design_type = %s"
            result = self._db.execute_fetchval(query, (design_type.value,))
        else:
            query = "SELECT COUNT(*) as count FROM design"
            result = self._db.execute_fetchval(query)
        
        return result or 0

    def update(self, design_id: str, update_data: dict[str, Any]) -> Design:
        """Update a design."""
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
        params: dict[str, Any] = {"id": design_id}
        
        for key, value in update_data.items():
            set_clauses.append(f"{key} = %({key})s")
            params[key] = value
        
        query = f"""
            UPDATE design
            SET {', '.join(set_clauses)}
            WHERE id = %(id)s
            RETURNING *
        """
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise NotFoundError(detail=f"Design with ID '{design_id}' not found")
        
        return Design(**result)

    def delete(self, design_id: str) -> bool:
        """Delete a design."""
        query = "DELETE FROM design WHERE id = %s RETURNING id"
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, (design_id,))
        
        return result is not None

