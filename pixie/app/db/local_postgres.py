"""Helper to spawn and manage a local PostgreSQL database instance."""
import atexit
import os
import subprocess
import time
from pathlib import Path
from typing import Optional

from app.server.config import load_env_files


class LocalPostgresManager:
    """Manages a local PostgreSQL database instance."""
    
    def __init__(self, db_name: str = "pixie", port: int = 5433, data_dir: Optional[str] = None):
        """
        Initialize the local PostgreSQL manager.
        
        Args:
            db_name: Name of the database to create
            port: Port to run PostgreSQL on (default 5433 to avoid conflicts)
            data_dir: Directory to store database files (defaults to ./data/postgres)
        """
        self.db_name = db_name
        self.port = port
        self.data_dir = Path(data_dir or "./data/postgres")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.container_name = f"pixie-postgres-{port}"
        self._container_id = None
        
    def _check_docker(self) -> bool:
        """Check if Docker is available."""
        try:
            subprocess.run(
                ["docker", "--version"],
                capture_output=True,
                check=True,
                timeout=5
            )
            return True
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return False
    
    def _is_container_running(self) -> bool:
        """Check if the PostgreSQL container is already running."""
        try:
            result = subprocess.run(
                ["docker", "ps", "--filter", f"name={self.container_name}", "--format", "{{.Names}}"],
                capture_output=True,
                text=True,
                timeout=5
            )
            return self.container_name in result.stdout
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return False
    
    def start_docker_postgres(self) -> str:
        """
        Start a PostgreSQL container using Docker.
        
        Returns:
            Connection string (DATABASE_URL)
        """
        if not self._check_docker():
            raise RuntimeError("Docker is not available. Please install Docker or use a local PostgreSQL installation.")
        
        # Check if container is already running
        if self._is_container_running():
            return f"postgresql://postgres:postgres@localhost:{self.port}/{self.db_name}"
        
        # Start the container
        print(f"Starting PostgreSQL container '{self.container_name}' on port {self.port}...")
        
        cmd = [
            "docker", "run",
            "--name", self.container_name,
            "-e", "POSTGRES_PASSWORD=postgres",
            "-e", "POSTGRES_DB=postgres",
            "-p", f"{self.port}:5432",
            "-d",
            "postgres:16-alpine"
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                timeout=30
            )
            self._container_id = result.stdout.strip()
            
            # Wait for PostgreSQL to be ready
            print("Waiting for PostgreSQL to be ready...")
            max_attempts = 30
            for i in range(max_attempts):
                try:
                    # Try to connect
                    test_cmd = [
                        "docker", "exec", self.container_name,
                        "psql", "-U", "postgres", "-c", "SELECT 1;"
                    ]
                    subprocess.run(
                        test_cmd,
                        capture_output=True,
                        check=True,
                        timeout=5
                    )
                    break
                except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
                    if i < max_attempts - 1:
                        time.sleep(1)
                    else:
                        raise RuntimeError("PostgreSQL container started but failed to become ready")
            
            # Create the database if it doesn't exist
            create_db_cmd = [
                "docker", "exec", self.container_name,
                "psql", "-U", "postgres", "-c", f"CREATE DATABASE {self.db_name};"
            ]
            subprocess.run(
                create_db_cmd,
                capture_output=True,
                check=False,  # Don't fail if database already exists
                timeout=10
            )
            
            # Apply schema if schema.sql exists
            self._apply_schema(f"postgresql://postgres:postgres@localhost:{self.port}/{self.db_name}")
            
            # Register cleanup
            atexit.register(self.stop_docker_postgres)
            
            print(f"PostgreSQL is ready! Database: {self.db_name}, Port: {self.port}")
            return f"postgresql://postgres:postgres@localhost:{self.port}/{self.db_name}"
            
        except subprocess.CalledProcessError as e:
            # Check if container already exists but is stopped
            if "already in use" in e.stderr.lower() or "already exists" in e.stderr.lower():
                # Try to start existing container
                subprocess.run(
                    ["docker", "start", self.container_name],
                    check=True,
                    timeout=10
                )
                return f"postgresql://postgres:postgres@localhost:{self.port}/{self.db_name}"
            raise RuntimeError(f"Failed to start PostgreSQL container: {e.stderr}")
    
    def stop_docker_postgres(self) -> None:
        """Stop and remove the PostgreSQL container."""
        if not self._check_docker():
            return
        
        try:
            # Stop the container
            subprocess.run(
                ["docker", "stop", self.container_name],
                capture_output=True,
                timeout=10
            )
            # Remove the container
            subprocess.run(
                ["docker", "rm", self.container_name],
                capture_output=True,
                timeout=10
            )
            print(f"Stopped and removed PostgreSQL container '{self.container_name}'")
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            pass  # Container might not exist or already be removed
    
    def _apply_schema(self, database_url: str) -> None:
        """Apply the database schema from schema.sql."""
        schema_file = Path(__file__).parent / "schema.sql"
        if not schema_file.exists():
            print("Warning: schema.sql not found, skipping schema application")
            return
        
        try:
            import psycopg
            with psycopg.connect(database_url) as conn:
                with conn.cursor() as cur:
                    with open(schema_file, "r") as f:
                        schema_sql = f.read()
                        cur.execute(schema_sql)
                    conn.commit()
            print("✓ Database schema applied successfully")
        except Exception as e:
            print(f"Warning: Failed to apply schema: {e}")
            # Don't fail setup if schema application fails
    
    def get_local_postgres_url(self) -> Optional[str]:
        """
        Try to get a connection URL for a local PostgreSQL installation.
        
        Returns:
            Connection string if local PostgreSQL is available, None otherwise
        """
        # Try common default ports
        for port in [5432, 5433]:
            try:
                import psycopg
                # Try to connect
                conn = psycopg.connect(
                    f"postgresql://postgres:postgres@localhost:{port}/postgres",
                    connect_timeout=2
                )
                conn.close()
                # Database exists, return URL
                url = f"postgresql://postgres:postgres@localhost:{port}/{self.db_name}"
                # Apply schema
                self._apply_schema(url)
                return url
            except Exception:
                continue
        
        return None
    
    def setup(self, prefer_docker: bool = True) -> str:
        """
        Set up a local PostgreSQL database.
        
        Args:
            prefer_docker: If True, prefer Docker over local installation
            
        Returns:
            Connection string (DATABASE_URL)
        """
        if prefer_docker and self._check_docker():
            try:
                return self.start_docker_postgres()
            except Exception as e:
                print(f"Failed to start Docker PostgreSQL: {e}")
                print("Falling back to local PostgreSQL installation...")
        
        # Try local PostgreSQL
        local_url = self.get_local_postgres_url()
        if local_url:
            print(f"Using local PostgreSQL installation at {local_url}")
            return local_url
        
        raise RuntimeError(
            "No PostgreSQL instance available. Options:\n"
            "1. Install Docker and run: python -m pixie.app.db.local_postgres setup\n"
            "2. Install PostgreSQL locally and ensure it's running\n"
            "3. Set DATABASE_URL environment variable to an existing PostgreSQL instance"
        )


def setup_local_postgres(db_name: str = "pixie", port: int = 5433) -> str:
    """
    Convenience function to set up a local PostgreSQL database.
    
    Args:
        db_name: Name of the database
        port: Port to run PostgreSQL on
        
    Returns:
        Connection string (DATABASE_URL)
    """
    manager = LocalPostgresManager(db_name=db_name, port=port)
    return manager.setup()


if __name__ == "__main__":
    """CLI interface for setting up local PostgreSQL."""
    import sys
    
    load_env_files()
    
    if len(sys.argv) > 1 and sys.argv[1] == "setup":
        db_name = os.getenv("DB_NAME", "pixie")
        port = int(os.getenv("DB_PORT", "5433"))
        
        manager = LocalPostgresManager(db_name=db_name, port=port)
        try:
            url = manager.setup()
            print(f"\n✓ PostgreSQL is ready!")
            print(f"Set this in your .env file:")
            print(f"DATABASE_URL={url}\n")
        except Exception as e:
            print(f"✗ Failed to set up PostgreSQL: {e}")
            sys.exit(1)
    elif len(sys.argv) > 1 and sys.argv[1] == "stop":
        port = int(os.getenv("DB_PORT", "5433"))
        manager = LocalPostgresManager(port=port)
        manager.stop_docker_postgres()
    else:
        print("Usage:")
        print("  python -m pixie.app.db.local_postgres setup  # Set up local PostgreSQL")
        print("  python -m pixie.app.db.local_postgres stop    # Stop Docker PostgreSQL")

