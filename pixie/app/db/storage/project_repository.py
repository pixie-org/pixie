"""Repository for project database operations."""
from typing import Any

from app.db.db_client import DbClient, db
from app.db.models.projects import Project
from app.server.exceptions import NotFoundError


class ProjectRepository:
    """Repository for project database operations."""

    TABLE_NAME = "project"

    def __init__(self, db_client: DbClient | None = None):
        """Initialize with database client."""
        self._db = db_client or db

    def create(self, project_data: Project) -> Project:
        """Create a new project in the database."""
        data = project_data.model_dump(
            exclude_none=True,
            exclude={"created_at", "updated_at"},
            mode="json",
        )
        
        query = """
            INSERT INTO project (id, name, description, owner_id)
            VALUES (%(id)s, %(name)s, %(description)s, %(owner_id)s)
            RETURNING *
        """
        
        params = {
            "id": data["id"],
            "name": data["name"],
            "description": data.get("description"),
            "owner_id": data["owner_id"],
        }
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
            
            # Automatically add owner to project_user table
            project_user_query = """
                INSERT INTO project_user (project_id, user_id)
                VALUES (%(project_id)s, %(user_id)s)
            """
            project_user_params = {
                "project_id": data["id"],
                "user_id": data["owner_id"],
            }
            self._db.execute(project_user_query, project_user_params)
        
        if not result:
            raise ValueError("Failed to create project")
        
        return Project(**result)

    def get_by_id(self, project_id: str) -> Project:
        """Get a project by ID."""
        query = "SELECT * FROM project WHERE id = %s"
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, (project_id,))

        if not result:
            raise NotFoundError(detail=f"Project with ID '{project_id}' not found")
        
        return Project(**result)

    def list_by_user(self, user_id: str) -> list[Project]:
        """List all projects accessible by a user (owner or member)."""
        query = """
            SELECT DISTINCT p.*
            FROM project p
            LEFT JOIN project_user pu ON p.id = pu.project_id
            WHERE p.owner_id = %(user_id)s OR pu.user_id = %(user_id)s
            ORDER BY p.created_at DESC
        """
        
        with self._db.transaction():
            result = self._db.execute_fetchall(query, {"user_id": user_id})
        
        return [Project(**row) for row in result]

    def update(self, project_id: str, update_data: dict[str, Any]) -> Project:
        """Update a project."""
        # Remove updated_at from manual update - it's handled by database trigger
        update_data = {k: v for k, v in update_data.items() if k != "updated_at"}
        
        if not update_data:
            raise ValueError("No fields to update")
        
        # Whitelist allowed columns to prevent SQL injection
        allowed_columns = {"name", "description"}
        update_data = {k: v for k, v in update_data.items() if k in allowed_columns}
        
        if not update_data:
            raise ValueError("No valid fields to update")
        
        # Build dynamic UPDATE query
        set_clauses = []
        params: dict[str, Any] = {"id": project_id}
        
        for key, value in update_data.items():
            set_clauses.append(f"{key} = %({key})s")
            params[key] = value
        
        query = f"""
            UPDATE project
            SET {', '.join(set_clauses)}
            WHERE id = %(id)s
            RETURNING *
        """
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, params)
        
        if not result:
            raise NotFoundError(detail=f"Project with ID '{project_id}' not found")
        
        return Project(**result)

    def delete(self, project_id: str) -> bool:
        """Delete a project."""
        query = "DELETE FROM project WHERE id = %s RETURNING id"
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, (project_id,))
        
        return result is not None

    def user_has_access(self, project_id: str, user_id: str) -> bool:
        """Check if a user has access to a project (owner or member)."""
        query = """
            SELECT 1
            FROM project p
            LEFT JOIN project_user pu ON p.id = pu.project_id
            WHERE p.id = %(project_id)s
            AND (p.owner_id = %(user_id)s OR pu.user_id = %(user_id)s)
            LIMIT 1
        """
        
        with self._db.transaction():
            result = self._db.execute_fetchone(query, {"project_id": project_id, "user_id": user_id})
        
        return result is not None

    def add_user(self, project_id: str, user_id: str) -> None:
        """Add a user to a project."""
        # Verify project exists
        self.get_by_id(project_id)
        
        query = """
            INSERT INTO project_user (project_id, user_id)
            VALUES (%(project_id)s, %(user_id)s)
            ON CONFLICT (project_id, user_id) DO NOTHING
        """
        
        params = {
            "project_id": project_id,
            "user_id": user_id,
        }
        
        with self._db.transaction():
            self._db.execute(query, params)

    def remove_user(self, project_id: str, user_id: str) -> None:
        """Remove a user from a project (cannot remove owner)."""
        # Verify project exists
        project = self.get_by_id(project_id)
        
        # Cannot remove owner
        if project.owner_id == user_id:
            raise ValueError("Cannot remove project owner")
        
        query = """
            DELETE FROM project_user
            WHERE project_id = %(project_id)s AND user_id = %(user_id)s
        """
        
        params = {
            "project_id": project_id,
            "user_id": user_id,
        }
        
        with self._db.transaction():
            self._db.execute(query, params)

    def list_project_users(self, project_id: str) -> list[str]:
        """List all user IDs with access to a project."""
        query = """
            SELECT DISTINCT user_id
            FROM (
                SELECT owner_id as user_id
                FROM project
                WHERE id = %(project_id)s
                UNION
                SELECT user_id
                FROM project_user
                WHERE project_id = %(project_id)s
            ) AS all_users
        """
        
        with self._db.transaction():
            result = self._db.execute_fetchall(query, {"project_id": project_id})
        
        return [row["user_id"] for row in result]

