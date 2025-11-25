"""Repository for ui_widget_resource database operations."""
from typing import Any

from app.db.db_client import DbClient, db
from app.db.models.widgets import UiWidgetResource
from app.server.exceptions import NotFoundError


class UiWidgetResourceRepository:
    """Repository for ui_widget_resource database operations."""

    TABLE_NAME = "ui_widget_resource"
    MAX_RESOURCES_PER_WIDGET = 20

    def __init__(self, db_client: DbClient | None = None):
        """Initialize with database client."""
        self._db = db_client or db

    def create(self, resource_data: UiWidgetResource) -> UiWidgetResource:
        """
        Create a new ui_widget_resource in the database.
        
        If creating would exceed MAX_RESOURCES_PER_WIDGET for the widget,
        deletes the oldest resources first.
        """
        data = resource_data.model_dump(
            exclude_none=True,
            exclude={"created_at", "updated_at"},
            mode="json",
        )
        
        with self._db.transaction():
            # Check current count for this widget
            count_query = "SELECT COUNT(*) as count FROM ui_widget_resource WHERE widget_id = %s"
            current_count = self._db.execute_fetchval(count_query, (data["widget_id"],)) or 0
            
            # If at or over limit, delete oldest resources
            if current_count >= self.MAX_RESOURCES_PER_WIDGET:
                # Calculate how many to delete
                to_delete = current_count - self.MAX_RESOURCES_PER_WIDGET + 1
                
                # Delete oldest resources (by created_at)
                delete_query = """
                    DELETE FROM ui_widget_resource
                    WHERE widget_id = %s
                    AND id IN (
                        SELECT id FROM ui_widget_resource
                        WHERE widget_id = %s
                        ORDER BY created_at ASC
                        LIMIT %s
                    )
                """
                self._db.execute(delete_query, (data["widget_id"], data["widget_id"], to_delete))
            
            # Insert new resource
            query = """
                INSERT INTO ui_widget_resource (id, widget_id, resource)
                VALUES (%(id)s, %(widget_id)s, %(resource)s::jsonb)
                RETURNING *
            """
            
            import json
            resource_json = json.dumps(data["resource"])
            
            params = {
                "id": data["id"],
                "widget_id": data["widget_id"],
                "resource": resource_json,
            }
            
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise ValueError("Failed to create ui_widget_resource")
        
        # Parse resource JSON back to dict if needed
        if isinstance(result["resource"], str):
            import json
            result["resource"] = json.loads(result["resource"])
        
        return UiWidgetResource(**result)

    def get_by_id(self, resource_id: str) -> UiWidgetResource:
        """Get a ui_widget_resource by ID."""
        query = "SELECT * FROM ui_widget_resource WHERE id = %s"
        
        result = self._db.execute_fetchone(query, (resource_id,))
        
        if not result:
            raise NotFoundError(detail=f"UiWidgetResource with ID '{resource_id}' not found")
        
        # Parse resource JSON back to dict if needed
        if isinstance(result["resource"], str):
            import json
            result["resource"] = json.loads(result["resource"])
        
        return UiWidgetResource(**result)

    def list_by_widget_id(self, widget_id: str) -> list[UiWidgetResource]:
        """List all ui_widget_resources for a widget."""
        query = "SELECT * FROM ui_widget_resource WHERE widget_id = %s ORDER BY created_at DESC"
        
        results = self._db.execute_fetchall(query, (widget_id,))
        
        # Parse resource JSON back to dict if needed
        for row in results:
            if isinstance(row["resource"], str):
                import json
                row["resource"] = json.loads(row["resource"])
        
        return [UiWidgetResource(**row) for row in results]

    def get_latest_by_widget_id(self, widget_id: str) -> UiWidgetResource | None:
        """Get the latest ui_widget_resource for a widget (most recent by created_at)."""
        query = """
            SELECT * FROM ui_widget_resource 
            WHERE widget_id = %s 
            ORDER BY created_at DESC 
            LIMIT 1
        """
        
        result = self._db.execute_fetchone(query, (widget_id,))
        
        if not result:
            return None
        
        # Parse resource JSON back to dict if needed
        if isinstance(result["resource"], str):
            import json
            result["resource"] = json.loads(result["resource"])
        
        return UiWidgetResource(**result)

    def list_all(self) -> list[UiWidgetResource]:
        """List all ui_widget_resources."""
        query = "SELECT * FROM ui_widget_resource ORDER BY created_at DESC"
        
        results = self._db.execute_fetchall(query)
        
        # Parse resource JSON back to dict if needed
        for row in results:
            if isinstance(row["resource"], str):
                import json
                row["resource"] = json.loads(row["resource"])
        
        return [UiWidgetResource(**row) for row in results]

    def update(self, resource_id: str, update_data: dict[str, Any]) -> UiWidgetResource:
        """Update a ui_widget_resource."""
        # Remove updated_at from manual update - it's handled by database trigger
        update_data = {k: v for k, v in update_data.items() if k != "updated_at"}
        
        if not update_data:
            raise ValueError("No fields to update")
        
        # Whitelist allowed columns to prevent SQL injection
        allowed_columns = {"resource"}
        update_data = {k: v for k, v in update_data.items() if k in allowed_columns}
        
        if not update_data:
            raise ValueError("No valid fields to update")
        
        # Build dynamic UPDATE query
        set_clauses = []
        params: dict[str, Any] = {"id": resource_id}
        
        for key, value in update_data.items():
            if key == "resource":
                import json
                set_clauses.append(f"{key} = %({key})s::jsonb")
                params[key] = json.dumps(value)
            else:
                set_clauses.append(f"{key} = %({key})s")
                params[key] = value
        
        query = f"""
            UPDATE ui_widget_resource
            SET {', '.join(set_clauses)}
            WHERE id = %(id)s
            RETURNING *
        """
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise NotFoundError(detail=f"UiWidgetResource with ID '{resource_id}' not found")
        
        # Parse resource JSON back to dict if needed
        if isinstance(result["resource"], str):
            import json
            result["resource"] = json.loads(result["resource"])
        
        return UiWidgetResource(**result)

    def delete(self, resource_id: str) -> bool:
        """Delete a ui_widget_resource."""
        query = "DELETE FROM ui_widget_resource WHERE id = %s RETURNING id"
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, (resource_id,))
        
        return result is not None

