"""Repository for widget database operations."""
from typing import Any

from app.db.db_client import DbClient, db
from app.db.models.widgets import Widget
from app.server.exceptions import NotFoundError


class WidgetRepository:
    """Repository for widget database operations."""

    TABLE_NAME = "widget"

    def __init__(self, db_client: DbClient | None = None):
        """Initialize with database client."""
        self._db = db_client or db

    def create(self, widget_data: Widget) -> Widget:
        """Create a new widget in the database."""
        data = widget_data.model_dump(
            exclude_none=True,
            exclude={"created_at", "updated_at"},
            mode="json",
        )
        
        # Handle nullable ui_widget_resource_id
        ui_resource_id = data.get("ui_widget_resource_id")
        
        if ui_resource_id is not None:
            query = """
                INSERT INTO widget (id, name, description, ui_widget_resource_id)
                VALUES (%(id)s, %(name)s, %(description)s, %(ui_widget_resource_id)s)
                RETURNING *
            """
            params = {
                "id": data["id"],
                "name": data["name"],
                "description": data["description"],
                "ui_widget_resource_id": ui_resource_id,
            }
        else:
            query = """
                INSERT INTO widget (id, name, description)
                VALUES (%(id)s, %(name)s, %(description)s)
                RETURNING *
            """
            params = {
                "id": data["id"],
                "name": data["name"],
                "description": data["description"],
            }
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise ValueError("Failed to create widget")
        
        return Widget(**result)

    def get_by_id(self, widget_id: str) -> Widget:
        """Get a widget by ID."""
        query = "SELECT * FROM widget WHERE id = %s"
        
        result = self._db.execute_fetchone(query, (widget_id,))
        
        if not result:
            raise NotFoundError(detail=f"Widget with ID '{widget_id}' not found")
        
        return Widget(**result)

    def list_all(self) -> list[Widget]:
        """List all widgets."""
        query = "SELECT * FROM widget ORDER BY created_at DESC"
        
        results = self._db.execute_fetchall(query)
        
        return [Widget(**row) for row in results]

    def list_paginated(self, limit: int = 20, offset: int = 0) -> list[Widget]:
        """List widgets with pagination."""
        query = """
            SELECT * FROM widget 
            ORDER BY created_at DESC 
            LIMIT %s OFFSET %s
        """
        
        results = self._db.execute_fetchall(query, (limit, offset))
        
        return [Widget(**row) for row in results]

    def count(self) -> int:
        """Count total number of widgets."""
        query = "SELECT COUNT(*) as count FROM widget"
        
        result = self._db.execute_fetchval(query)
        
        return result or 0

    def update(self, widget_id: str, update_data: dict[str, Any]) -> Widget:
        """Update a widget."""
        # Remove updated_at from manual update - it's handled by database trigger
        update_data = {k: v for k, v in update_data.items() if k != "updated_at"}
        
        if not update_data:
            raise ValueError("No fields to update")
        
        # Whitelist allowed columns to prevent SQL injection
        allowed_columns = {"name", "description", "ui_widget_resource_id"}
        update_data = {k: v for k, v in update_data.items() if k in allowed_columns}
        
        if not update_data:
            raise ValueError("No valid fields to update")
        
        # Build dynamic UPDATE query
        set_clauses = []
        params: dict[str, Any] = {"id": widget_id}
        
        for key, value in update_data.items():
            set_clauses.append(f"{key} = %({key})s")
            params[key] = value
        
        query = f"""
            UPDATE widget
            SET {', '.join(set_clauses)}
            WHERE id = %(id)s
            RETURNING *
        """
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise NotFoundError(detail=f"Widget with ID '{widget_id}' not found")
        
        return Widget(**result)

    def delete(self, widget_id: str) -> bool:
        """Delete a widget."""
        query = "DELETE FROM widget WHERE id = %s RETURNING id"
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, (widget_id,))
        
        return result is not None

