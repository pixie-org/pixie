"""Repository for tool_widget junction table operations."""
from logging import getLogger

from app.db.db_client import DbClient, db
from app.db.models.widgets import ToolWidget

logger = getLogger(__name__)


class ToolWidgetRepository:
    """Repository for tool_widget database operations."""

    TABLE_NAME = "tool_widget"

    def __init__(self, db_client: DbClient | None = None):
        """Initialize with database client."""
        self._db = db_client or db

    def create(self, tool_id: str, widget_id: str) -> ToolWidget:
        """Create a new tool_widget relationship."""
        query = """
            INSERT INTO tool_widget (tool_id, widget_id)
            VALUES (%(tool_id)s, %(widget_id)s)
            RETURNING *
        """
        
        params = {
            "tool_id": tool_id,
            "widget_id": widget_id,
        }
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise ValueError("Failed to create tool_widget relationship")
        
        return ToolWidget(**result)

    def set_tools_for_widget(self, widget_id: str, tool_ids: list[str]) -> list[ToolWidget]:
        """
        Set tools for a widget, replacing any existing relationships.
        
        Args:
            widget_id: The widget ID
            tool_ids: List of tool IDs to associate with the widget
            
        Returns:
            List of created ToolWidget relationships
        """
        with self._db.transaction():
            # Delete existing relationships for this widget
            delete_query = "DELETE FROM tool_widget WHERE widget_id = %s"
            self._db.execute(delete_query, (widget_id,))
            
            # Create new relationships
            relationships = []
            for tool_id in tool_ids:
                try:
                    # Use INSERT ON CONFLICT to handle duplicates gracefully
                    insert_query = """
                        INSERT INTO tool_widget (tool_id, widget_id)
                        VALUES (%(tool_id)s, %(widget_id)s)
                        ON CONFLICT (tool_id, widget_id) DO NOTHING
                        RETURNING *
                    """
                    params = {"tool_id": tool_id, "widget_id": widget_id}
                    result = self._db.execute_fetchone(insert_query, params)
                    
                    if result:
                        relationships.append(ToolWidget(**result))
                except Exception as e:
                    # Log but continue with other tools
                    logger.warning(f"Failed to create tool_widget relationship for tool {tool_id} and widget {widget_id}: {str(e)}")
                    continue
            
            return relationships

    def get_by_widget_id(self, widget_id: str) -> list[ToolWidget]:
        """Get all tool_widget relationships for a widget."""
        query = "SELECT * FROM tool_widget WHERE widget_id = %s ORDER BY created_at DESC"
        
        results = self._db.execute_fetchall(query, (widget_id,))
        
        return [ToolWidget(**row) for row in results]

    def get_by_tool_id(self, tool_id: str) -> list[ToolWidget]:
        """Get all tool_widget relationships for a tool."""
        query = "SELECT * FROM tool_widget WHERE tool_id = %s ORDER BY created_at DESC"
        
        results = self._db.execute_fetchall(query, (tool_id,))
        
        return [ToolWidget(**row) for row in results]

    def delete(self, tool_id: str, widget_id: str) -> bool:
        """Delete a tool_widget relationship."""
        query = "DELETE FROM tool_widget WHERE tool_id = %s AND widget_id = %s RETURNING tool_id"
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, (tool_id, widget_id))
        
        return result is not None

