#!/usr/bin/env python3
"""
Database setup script for Pixie.

This script executes the schema.sql file against a Supabase/external PostgreSQL database
configured via the DATABASE_URL environment variable.

Note: This script is only for Supabase/external databases. If DB_USE_LOCAL=true is set,
the schema is automatically applied when the local database is set up, so this script
will be a no-op.

Usage:
    python setup_db.py

Or from the root directory:
    python pixie/setup_db.py

Make sure your .env file is configured with DATABASE_URL before running.
"""
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from psycopg import connect

# Load environment variables
# Try to load from root .env file first
root_dir = Path(__file__).parent.parent
env_file = root_dir / ".env"
if env_file.exists():
    load_dotenv(dotenv_path=env_file)

# Also try .env.local if it exists
env_local = root_dir / ".env.local"
if env_local.exists():
    load_dotenv(dotenv_path=env_local, override=True)


def main():
    """Execute the database schema setup."""
    # Check if using local database - if so, this script is a no-op
    use_local = os.getenv("DB_USE_LOCAL", "false").lower() == "true"
    if use_local:
        print("ℹ️  DB_USE_LOCAL is set to true.")
        print("   The database schema is automatically applied when the local database is set up.")
        print("   This script is not needed for local databases.")
        print("   ✓ No action required.")
        return
    
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable is not set.")
        print("\nPlease set DATABASE_URL in your .env file:")
        print("DATABASE_URL='postgresql://postgres.[DATABASE]:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres'")
        print("\nOr if you want to use a local database, set:")
        print("DB_USE_LOCAL=true")
        sys.exit(1)

    # Get the schema.sql file path
    script_dir = Path(__file__).parent
    schema_file = script_dir / "app" / "db" / "schema.sql"

    if not schema_file.exists():
        print(f"ERROR: Schema file not found at {schema_file}")
        sys.exit(1)

    # Read the schema file
    print(f"Reading schema from {schema_file}...")
    try:
        with open(schema_file, "r", encoding="utf-8") as f:
            schema_sql = f.read()
    except Exception as e:
        print(f"ERROR: Failed to read schema file: {e}")
        sys.exit(1)

    # Connect to database and execute schema
    print("Connecting to database...")
    try:
        with connect(database_url) as conn:
            with conn.cursor() as cur:
                print("Executing schema...")
                cur.execute(schema_sql)
                conn.commit()
                print("✓ Database schema setup completed successfully!")
    except Exception as e:
        print(f"ERROR: Failed to execute schema: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

