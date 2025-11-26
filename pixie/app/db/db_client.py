import os
import threading
from contextlib import contextmanager
from typing import Any, Iterator, Optional, Union

from app.server.config import load_env_files

# Thread local storage for the database connection
tls = threading.local()

# Try to import PostgreSQL dependencies (optional)
try:
    from psycopg import Connection, Cursor
    from psycopg.rows import dict_row
    from psycopg_pool import ConnectionPool
    PSYCOPG_AVAILABLE = True
except ImportError:
    PSYCOPG_AVAILABLE = False


class DbClient:
    """
    Database connection manager with automatic connection and transaction handling.
    
    Uses thread-local storage to maintain one connection and cursor per thread.
    Automatically handles connection and cursor management for queries.
    """

    def __init__(self, db_url: Optional[str] = None):
        """
        Initialize the database client.
        
        Args:
            db_url: Optional database URL. If not provided, reads from DATABASE_URL env var.
                   Note: Environment files should be loaded before calling this if db_url is None.
        """
        if not PSYCOPG_AVAILABLE:
            raise ImportError("psycopg is required for DbClient. Install it with: pip install psycopg[binary] psycopg-pool")
        
        # Use provided db_url or read from environment
        self.db_url = db_url or os.getenv("DATABASE_URL")
        if not self.db_url:
            raise ValueError("DATABASE_URL environment variable is not set")
        self.pool = ConnectionPool(self.db_url, open=True)

    def _get_connection(self) -> Connection:
        """Get or create a thread-local connection."""
        if not hasattr(tls, "connection"):
            conn_ctx = self.pool.connection()
            conn = conn_ctx.__enter__()
            conn.autocommit = False
            tls.connection = conn
            tls.connection_context = conn_ctx
        return tls.connection

    def _get_cursor(self) -> Cursor:
        """Get or create a thread-local cursor."""
        conn = self._get_connection()      
        if not hasattr(tls, "cursor"):
            tls.cursor = conn.cursor(row_factory=dict_row)

        return tls.cursor

    def execute(
        self, 
        query: str, 
        params: Optional[Union[tuple, dict]] = None
    ) -> None:
        """
        Execute a query without returning results.
        
        Args:
            query: SQL query string
            params: Optional parameters for the query (tuple or dict)
        
        Example:
            db.execute("INSERT INTO users (name) VALUES (%s)", ("John",))
        """
        cursor = self._get_cursor()
        cursor.execute(query, params)

    def execute_fetchall(
        self,
        query: str,
        params: Optional[Union[tuple, dict]] = None
    ) -> list:
        """
        Execute a query and fetch all results.
        
        Args:
            query: SQL query string
            params: Optional parameters for the query (tuple or dict)
        
        Returns:
            List of result rows (as dictionaries)
            
        Example:
            users = db.execute_fetchall("SELECT * FROM users WHERE age > %s", (18,))
        """
        cursor = self._get_cursor()
        cursor.execute(query, params)
        return cursor.fetchall()

    def execute_fetchone(
        self,
        query: str,
        params: Optional[Union[tuple, dict]] = None
    ) -> Optional[Any]:
        """
        Execute a query and fetch one result.
        
        Args:
            query: SQL query string
            params: Optional parameters for the query (tuple or dict)
        
        Returns:
            Single result row (as dictionary) or None if no results
            
        Example:
            user = db.execute_fetchone("SELECT * FROM users WHERE id = %s", (1,))
        """
        cursor = self._get_cursor()
        cursor.execute(query, params)
        return cursor.fetchone()

    def execute_fetchval(
        self,
        query: str,
        params: Optional[Union[tuple, dict]] = None
    ) -> Optional[Any]:
        """
        Execute a query and fetch a single value (first column of first row).
        
        Args:
            query: SQL query string
            params: Optional parameters for the query (tuple or dict)
        
        Returns:
            Single value or None if no results
            
        Example:
            count = db.execute_fetchval("SELECT COUNT(*) FROM users")
        """
        cursor = self._get_cursor()
        cursor.execute(query, params)
        row = cursor.fetchone()
        return list(row.values())[0] if row else None


    @contextmanager
    def transaction(self) -> Iterator[None]:
        """
        Context manager for transaction handling.
        
        Automatically begins a transaction, commits on success, and rolls back on exception.
        
        Example:
            with db.transaction():
                db.execute("INSERT INTO users (name) VALUES (%s)", ("Alice",))
                db.execute("INSERT INTO users (name) VALUES (%s)", ("Bob",))
        """
        conn = self._get_connection()
        try:
            yield
            conn.commit()
        except Exception:
            conn.rollback()
            raise


def get_db_client():
    """
    Get the appropriate database client based on environment configuration.
    
    If DB_USE_LOCAL is set to 'true', automatically sets up a local PostgreSQL
    instance (Docker or local installation) and uses it.
    
    Otherwise, uses DATABASE_URL if set, or raises an error.
    """
    load_env_files()
    database_url = os.getenv("DATABASE_URL")
    use_local = os.getenv("DB_USE_LOCAL", "false").lower() == "true"
    
    # If DB_USE_LOCAL is set, set up local PostgreSQL
    if use_local:
        try:
            from app.db.local_postgres import setup_local_postgres
            database_url = setup_local_postgres()
            # Set it in environment for this process
            os.environ["DATABASE_URL"] = database_url
        except Exception as e:
            raise RuntimeError(
                f"Failed to set up local PostgreSQL: {e}\n"
                "Make sure Docker is installed and running, or PostgreSQL is installed locally."
            ) from e
    
    # If no DATABASE_URL is set, raise an error
    if not database_url:
        raise ValueError(
            "DATABASE_URL environment variable is not set.\n"
            "Options:\n"
            "1. Set DATABASE_URL to your PostgreSQL connection string\n"
            "2. Set DB_USE_LOCAL=true to automatically set up a local PostgreSQL instance"
        )
    
    # Use PostgreSQL - pass db_url directly to avoid reloading env files
    return DbClient(db_url=database_url)


# Create the default db instance
db = get_db_client()
