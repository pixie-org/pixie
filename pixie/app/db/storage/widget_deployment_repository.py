"""Repository for widget deployment database operations."""
from typing import Any

from app.db.db_client import DbClient, db
from app.db.models.widgets import WidgetDeployment
from app.server.exceptions import NotFoundError


class WidgetDeploymentRepository:
    """Repository for widget deployment database operations."""

    TABLE_NAME = "widget_deployment"

    def __init__(self, db_client: DbClient | None = None):
        """Initialize with database client."""
        self._db = db_client or db

    def create(self, deployment_data: WidgetDeployment) -> WidgetDeployment:
        """Create a new widget deployment in the database."""
        data = deployment_data.model_dump(
            exclude_none=True,
            exclude={"created_at", "updated_at"},
            mode="json",
        )
        
        query = """
            INSERT INTO widget_deployment (id, widget_id, deployment_type, deployment_url, deployment_status)
            VALUES (%(id)s, %(widget_id)s, %(deployment_type)s, %(deployment_url)s, %(deployment_status)s)
            RETURNING *
        """
        params = {
            "id": data["id"],
            "widget_id": data["widget_id"],
            "deployment_type": data["deployment_type"],
            "deployment_url": data["deployment_url"],
            "deployment_status": data["deployment_status"],
        }
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise ValueError("Failed to create widget deployment")
        
        return WidgetDeployment(**result)

    def get_by_id(self, deployment_id: str) -> WidgetDeployment:
        """Get a widget deployment by ID."""
        query = "SELECT * FROM widget_deployment WHERE id = %s"
        
        result = self._db.execute_fetchone(query, (deployment_id,))
        
        if not result:
            raise NotFoundError(detail=f"Widget deployment with ID '{deployment_id}' not found")
        
        return WidgetDeployment(**result)

    def list_by_widget_id(self, widget_id: str) -> list[WidgetDeployment]:
        """List all deployments for a widget."""
        query = "SELECT * FROM widget_deployment WHERE widget_id = %s ORDER BY created_at DESC"
        
        results = self._db.execute_fetchall(query, (widget_id,))
        
        return [WidgetDeployment(**row) for row in results]

    def list_all(self) -> list[WidgetDeployment]:
        """List all widget deployments."""
        query = "SELECT * FROM widget_deployment ORDER BY created_at DESC"
        
        results = self._db.execute_fetchall(query)
        
        return [WidgetDeployment(**row) for row in results]

    def update(self, deployment_id: str, update_data: dict[str, Any]) -> WidgetDeployment:
        """Update a widget deployment."""
        # Remove updated_at from manual update - it's handled by database trigger
        update_data = {k: v for k, v in update_data.items() if k != "updated_at"}
        
        if not update_data:
            raise ValueError("No fields to update")
        
        # Whitelist allowed columns to prevent SQL injection
        allowed_columns = {"deployment_url", "deployment_status"}
        update_data = {k: v for k, v in update_data.items() if k in allowed_columns}
        
        if not update_data:
            raise ValueError("No valid fields to update")
        
        # Build dynamic UPDATE query
        set_clauses = []
        params: dict[str, Any] = {"id": deployment_id}
        
        for key, value in update_data.items():
            set_clauses.append(f"{key} = %({key})s")
            params[key] = value
        
        query = f"""
            UPDATE widget_deployment
            SET {', '.join(set_clauses)}
            WHERE id = %(id)s
            RETURNING *
        """
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise NotFoundError(detail=f"Widget deployment with ID '{deployment_id}' not found")
        
        return WidgetDeployment(**result)

    def delete(self, deployment_id: str) -> bool:
        """Delete a widget deployment."""
        query = "DELETE FROM widget_deployment WHERE id = %s RETURNING id"
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, (deployment_id,))
        
        return result is not None

