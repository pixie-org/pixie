"""Repository for user database operations."""
from datetime import datetime, timezone

from app.db.db_client import DbClient, db
from app.db.models.users import User
from app.server.exceptions import NotFoundError


class UserRepository:
    """Repository for user database operations."""

    TABLE_NAME = "user"

    def __init__(self, db_client: DbClient | None = None):
        """Initialize with database client."""
        self._db = db_client or db

    def create(self, user_data: User) -> User:
        """Create a new user in the database."""
        query = """
            INSERT INTO "user" (id, email, name, avatar_url, last_login_at, last_activity_at, waitlisted)
            VALUES (%(id)s, %(email)s, %(name)s, %(avatar_url)s, %(last_login_at)s, %(last_activity_at)s, %(waitlisted)s)
            RETURNING *
        """
        params = {
            "id": user_data.id,
            "email": user_data.email,
            "name": user_data.name,
            "avatar_url": user_data.avatar_url,
            "last_login_at": user_data.last_login_at,
            "last_activity_at": user_data.last_activity_at,
            "waitlisted": user_data.waitlisted,
        }
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise ValueError("Failed to create user")
        
        return User(**result)

    def get_by_id(self, user_id: str) -> User:
        """Get a user by ID."""
        query = 'SELECT * FROM "user" WHERE id = %s'
        
        result = self._db.execute_fetchone(query, (user_id,))
        
        if not result:
            raise NotFoundError(detail=f"User with ID '{user_id}' not found")
        
        return User(**result)

    def get_by_email(self, email: str) -> User | None:
        """Get a user by email."""
        query = 'SELECT * FROM "user" WHERE email = %s'
        
        result = self._db.execute_fetchone(query, (email,))
        
        if not result:
            return None
        
        return User(**result)


    def create_or_update(self, user_data: User) -> User:
        """
        Create a new user or return existing user by email.
        
        If a user with the same email exists, return that user without updating.
        OAuth provider information is only used for verification/authentication,
        not to overwrite existing user profile data.
        
        Otherwise, create a new user with the provided information.
        
        This ensures the same email always maps to the same user ID, regardless of OAuth provider.
        """
        # Check if user exists by email (email is the primary identifier)
        existing = self.get_by_email(user_data.email)
        
        if existing:
            # User with this email exists - return existing user without updating
            # OAuth provider info is only used for verification, not to overwrite profile data
            return existing
        
        # Create new user
        return self.create(user_data)

    def update(self, user_id: str, update_data: dict[str, str | None]) -> User:
        """Update a user."""
        # Remove updated_at from manual update - it's handled by database trigger
        update_data = {k: v for k, v in update_data.items() if k != "updated_at"}
        
        if not update_data:
            raise ValueError("No fields to update")
        
        # Whitelist allowed columns to prevent SQL injection
        allowed_columns = {"email", "name", "avatar_url", "waitlisted"}
        update_data = {k: v for k, v in update_data.items() if k in allowed_columns}
        
        if not update_data:
            raise ValueError("No valid fields to update")
        
        # Build dynamic UPDATE query
        set_clauses = []
        params: dict[str, str | None] = {"id": user_id}
        
        for key, value in update_data.items():
            set_clauses.append(f"{key} = %({key})s")
            params[key] = value
        
        query = f"""
            UPDATE "user"
            SET {', '.join(set_clauses)}
            WHERE id = %(id)s
            RETURNING *
        """
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise NotFoundError(detail=f"User with ID '{user_id}' not found")
        
        return User(**result)

    def delete(self, user_id: str) -> bool:
        """Delete a user."""
        query = 'DELETE FROM "user" WHERE id = %s RETURNING id'
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, (user_id,))
        
        return result is not None

    def record_login(self, user_id: str) -> User:
        """Record a user login event."""
        now = datetime.now(timezone.utc)
        
        query = """
            UPDATE "user"
            SET 
                last_login_at = %(last_login_at)s,
                last_activity_at = %(last_activity_at)s
            WHERE id = %(user_id)s
            RETURNING *
        """
        params = {
            "user_id": user_id,
            "last_login_at": now,
            "last_activity_at": now,
        }
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise NotFoundError(detail=f"User with ID '{user_id}' not found")
        
        return User(**result)

    def record_activity(self, user_id: str) -> User:
        """Record a user activity event (any user action)."""
        now = datetime.now(timezone.utc)
        
        query = """
            UPDATE "user"
            SET last_activity_at = %(last_activity_at)s
            WHERE id = %(user_id)s
            RETURNING *
        """
        params = {
            "user_id": user_id,
            "last_activity_at": now,
        }
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise NotFoundError(detail=f"User with ID '{user_id}' not found")
        
        return User(**result)

