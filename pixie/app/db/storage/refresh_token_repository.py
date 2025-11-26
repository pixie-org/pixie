"""Repository for managing refresh tokens."""
from datetime import datetime
from typing import Optional

from app.db.db_client import DbClient, db
from app.db.models.refresh_tokens import RefreshToken


class RefreshTokenRepository:
    """Database access layer for refresh tokens."""

    TABLE_NAME = "user_refresh_token"

    def __init__(self, db_client: DbClient | None = None):
        self._db = db_client or db

    def create(
        self,
        *,
        record_id: str,
        user_id: str,
        token_id: str,
        token_hash: str,
        salt: str,
        expires_at: datetime,
    ) -> RefreshToken:
        query = f"""
            INSERT INTO {self.TABLE_NAME} (id, user_id, token_id, token_hash, salt, expires_at)
            VALUES (%(id)s, %(user_id)s, %(token_id)s, %(token_hash)s, %(salt)s, %(expires_at)s)
            RETURNING *
        """
        params = {
            "id": record_id,
            "user_id": user_id,
            "token_id": token_id,
            "token_hash": token_hash,
            "salt": salt,
            "expires_at": expires_at,
        }

        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)

        if not result:
            raise ValueError("Failed to create refresh token")

        return RefreshToken(**result)

    def get_by_token_id(self, token_id: str) -> Optional[RefreshToken]:
        query = f'SELECT * FROM {self.TABLE_NAME} WHERE token_id = %s'
        result = self._db.execute_fetchone(query, (token_id,))
        return RefreshToken(**result) if result else None

    def delete_by_token_id(self, token_id: str) -> None:
        query = f'DELETE FROM {self.TABLE_NAME} WHERE token_id = %s'
        with self._db.transaction():
            self._db.execute(query, (token_id,))

    def delete_by_user_id(self, user_id: str) -> None:
        query = f'DELETE FROM {self.TABLE_NAME} WHERE user_id = %s'
        with self._db.transaction():
            self._db.execute(query, (user_id,))

