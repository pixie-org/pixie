"""Repository for conversation and message database operations."""
import secrets
from typing import Any

from app.db.client import DatabaseClient, get_db_client
from app.db.models.conversations import Conversation, MessageDBModel
from app.server.exceptions import NotFoundError


def _generate_id() -> str:
    """Generate a random hexadecimal ID."""
    return secrets.token_hex(8)

def _generate_conversation_id() -> str:
    """Generate a random hexadecimal conversation ID."""
    return _generate_id()


def _generate_message_id() -> str:
    """Generate a random hexadecimal message ID."""
    return _generate_id()


class ConversationRepository:
    """Repository for conversation and message database operations."""

    CONVERSATIONS_TABLE = "conversations"
    MESSAGES_TABLE = "messages"

    def __init__(self, db_client: DatabaseClient | None = None):
        """Initialize with database client."""
        self._db = db_client or get_db_client()

    def get_or_create_conversation(
        self, project_id: str, tool_id: str
    ) -> Conversation:
        """
        Get an existing conversation for project_id and tool_id, or create a new one.
        
        Returns the same conversation_id if one already exists for this project_id and tool_id.
        """
        # Try to find existing conversation
        result = (
            self._db.table(self.CONVERSATIONS_TABLE)
            .select("*")
            .eq("project_id", project_id)
            .eq("tool_id", tool_id)
            .order("created_at", desc=True)  # Get the most recent one
            .limit(1)
            .execute()
        )

        if result.data:
            # Return existing conversation
            return Conversation(**result.data[0])

        # No existing conversation found, create a new one
        conversation_id = _generate_conversation_id()

        data = {
            "conversation_id": conversation_id,
            "project_id": project_id,
            "tool_id": tool_id,
        }

        insert_result = self._db.table(self.CONVERSATIONS_TABLE).insert(data).execute()

        if not insert_result.data:
            raise ValueError("Failed to create conversation")

        return Conversation(**insert_result.data[0])

    def get_conversation(self, conversation_id: str) -> Conversation:
        """Get a conversation by ID."""
        result = (
            self._db.table(self.CONVERSATIONS_TABLE)
            .select("*")
            .eq("conversation_id", conversation_id)
            .execute()
        )

        if not result.data:
            raise NotFoundError(
                detail=f"Conversation with ID '{conversation_id}' not found"
            )

        return Conversation(**result.data[0])

    def create_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        ui_resource: dict[str, Any] | None = None,
    ) -> MessageDBModel:
        """Create a new message in a conversation."""
        message_id = _generate_message_id()

        data = {
            "message_id": message_id,
            "conversation_id": conversation_id,
            "role": role,
            "content": content,
        }

        if ui_resource is not None:
            data["ui_resource"] = ui_resource

        result = self._db.table(self.MESSAGES_TABLE).insert(data).execute()

        if not result.data:
            raise ValueError("Failed to create message")

        return MessageDBModel(**result.data[0])

    def list_messages(
        self, conversation_id: str, limit: int | None = None
    ) -> list[MessageDBModel]:
        """List all messages for a conversation, ordered by creation time."""
        query = (
            self._db.table(self.MESSAGES_TABLE)
            .select("*")
            .eq("conversation_id", conversation_id)
            .order("created_at", desc=False)
        )

        if limit:
            query = query.limit(limit)

        result = query.execute()

        return [MessageDBModel(**row) for row in result.data]

