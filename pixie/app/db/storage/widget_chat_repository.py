"""Repository for widget chat and message database operations."""
import secrets

from app.db.db_client import DbClient, db
from app.db.models.chat import Conversation, Message, MessageRole
from app.server.exceptions import NotFoundError


def _generate_id() -> str:
    """Generate a random hexadecimal ID."""
    return secrets.token_hex(4)


def _generate_conversation_id() -> str:
    """Generate a random hexadecimal conversation ID."""
    return _generate_id()


def _generate_message_id() -> str:
    """Generate a random hexadecimal message ID."""
    return _generate_id()


class WidgetChatRepository:
    """Repository for widget chat and message database operations."""

    CHAT_TABLE = "widget_chat"
    MESSAGE_TABLE = "widget_message"

    def __init__(self, db_client: DbClient | None = None):
        """Initialize with database client."""
        self._db = db_client or db

    def get_or_create_conversation(self, widget_id: str) -> Conversation:
        """
        Get an existing conversation for widget_id, or create a new one.
        
        Returns the same conversation if one already exists for this widget_id.
        """
        # Try to find existing conversation
        query = """
            SELECT * FROM widget_chat
            WHERE widget_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """
        
        result = self._db.execute_fetchone(query, (widget_id,))
        
        if result:
            return Conversation(**result)
        
        # No existing conversation found, create a new one
        conversation_id = _generate_conversation_id()
        
        insert_query = """
            INSERT INTO widget_chat (id, widget_id)
            VALUES (%(id)s, %(widget_id)s)
            RETURNING *
        """
        
        params = {
            "id": conversation_id,
            "widget_id": widget_id,
        }
        
        with self._db.transaction():
            result = self._db.execute_fetchone(insert_query, params)
        
        if not result:
            raise ValueError("Failed to create conversation")
        
        return Conversation(**result)

    def get_conversation(self, conversation_id: str) -> Conversation:
        """Get a conversation by ID."""
        query = "SELECT * FROM widget_chat WHERE id = %s"
        
        result = self._db.execute_fetchone(query, (conversation_id,))
        
        if not result:
            raise NotFoundError(
                detail=f"Conversation with ID '{conversation_id}' not found"
            )
        
        return Conversation(**result)

    def create_message(
        self,
        conversation_id: str,
        role: str | MessageRole,
        content: str,
        ui_resource_id: str | None = None,
    ) -> Message:
        """Create a new message in a conversation."""
        message_id = _generate_message_id()
        
        # Convert role to string if it's an enum
        role_str = role.value if isinstance(role, MessageRole) else role
        
        insert_query = """
            INSERT INTO widget_message (id, conversation_id, role, content, ui_resource_id)
            VALUES (%(id)s, %(conversation_id)s, %(role)s::widget_message_role, %(content)s, %(ui_resource_id)s)
            RETURNING *
        """
        
        params = {
            "id": message_id,
            "conversation_id": conversation_id,
            "role": role_str,
            "content": content,
            "ui_resource_id": ui_resource_id,
        }

        with self._db.transaction():
            result = self._db.execute_fetchone(insert_query, params)
        
        if not result:
            raise ValueError("Failed to create message")

        return Message(**result)

    def list_messages(
        self, conversation_id: str, limit: int | None = None
    ) -> list[Message]:
        """List all messages for a conversation, ordered by creation time."""
        query = """
            SELECT * FROM widget_message
            WHERE conversation_id = %s
            ORDER BY created_at ASC
        """
        
        if limit:
            query += f" LIMIT {limit}"
        
        results = self._db.execute_fetchall(query, (conversation_id,))
        return [Message(**row) for row in results]

