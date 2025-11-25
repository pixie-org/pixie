import os
import threading
from contextlib import contextmanager
from typing import Any, Iterator, Optional, Union

from psycopg import Connection, Cursor
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.server.config import load_env_files

# Thread local storage for the database connection
tls = threading.local()


class DbClient:
    """
    Database connection manager with automatic connection and transaction handling.
    
    Uses thread-local storage to maintain one connection and cursor per thread.
    Automatically handles connection and cursor management for queries.
    """

    def __init__(self):
        load_env_files()
        self.db_url = os.getenv("DATABASE_URL")
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

db: DbClient = DbClient()
