# Detailed Setup Guide

This guide provides comprehensive setup instructions for Pixie. For a quick start, see the [main README](README.md).

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step-by-Step Setup](#step-by-step-setup)
- [Environment Variables](#environment-variables)
- [Database Configuration](#database-configuration)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

### Required

- **Python 3.10 or higher** - Required for the backend API
  - Download from [python.org](https://www.python.org/downloads/)
  - Verify: `python3 --version`

- **Node.js and npm** - Required for running the development server
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify: `node --version` and `npm --version`

- **pnpm** - Package manager for frontend dependencies
  - Install: `npm install -g pnpm`
  - Verify: `pnpm --version`

### Optional but Recommended

- **Docker** - Required if you want to use local PostgreSQL via Docker
  - If Docker is not available, the system will attempt to use a local PostgreSQL installation

#### Installing Docker

**On macOS:**
- Download and install [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
- Or use Homebrew: `brew install --cask docker`

**On Linux:**
- Follow the [Docker installation guide](https://docs.docker.com/engine/install/) for your distribution
- For Ubuntu/Debian: `sudo apt-get update && sudo apt-get install docker.io`
- Make sure Docker is running: `sudo systemctl start docker`

**On Windows:**
- Download and install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)

After installation, verify Docker is working:
```bash
docker --version
```

## Step-by-Step Setup

### 1. Create and Activate Virtual Environment (Recommended)

Create a Python virtual environment in the project root:

```bash
python3 -m venv venv
```

Activate the virtual environment:

**On macOS/Linux:**
```bash
source venv/bin/activate
```

**On Windows:**
```bash
venv\Scripts\activate
```

### 2. Install Backend Dependencies

Navigate to the `pixie` directory and install Python dependencies:

```bash
cd pixie
pip install -r requirements.txt
cd ..
```

### 3. Install Frontend Dependencies

Install Node.js dependencies for the frontend:

```bash
cd frontend
pnpm install
cd ..
```

### 4. Install Root Dependencies (Optional)

If you want to use npm scripts from the root directory:

```bash
npm install
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### LLM Configuration (Optional - for chat functionality)

- `LLM_PROVIDER` - LLM provider to use: `openai` or `claude` (default: `openai`)
- `OPENAI_API_KEY` - Your OpenAI API key (required if using OpenAI)
- `OPENAI_MODEL` - OpenAI model to use
- `ANTHROPIC_API_KEY` - Your Anthropic API key (required if using Claude)
  - **Note**: Environment variable name must be exactly `ANTHROPIC_API_KEY` (case-insensitive)
- `CLAUDE_MODEL` - Claude model to use

### Database Configuration

Choose one of the following options:

**Option 1: Use Local PostgreSQL (Recommended for Development)**

Set `DB_USE_LOCAL=true` in your `.env` file. The system will automatically:
- Start a PostgreSQL Docker container (if Docker is available and running)
- Or connect to a local PostgreSQL installation (if PostgreSQL is installed locally)
- Apply the database schema automatically

**Requirements:**
- Docker installed and running (recommended), OR
- PostgreSQL installed locally on your system

```env
DB_USE_LOCAL=true
```

**Option 2: Use Supabase/External PostgreSQL**

Set `DATABASE_URL` to your PostgreSQL connection string:

```env
DB_USE_LOCAL=false
DATABASE_URL=postgresql://postgres.[DATABASE]:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres
```

### Example .env file:

```env
# Database (choose one)
DB_USE_LOCAL=true

# LLM Configuration
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

## Database Setup

### If using Local PostgreSQL (`DB_USE_LOCAL=true`)

No manual setup required! The database schema is automatically applied when the application starts or when you first connect to the local database.

You can also manually set up the local database:
```bash
python -m pixie.app.db.local_postgres setup
```

To stop the local database:
```bash
python -m pixie.app.db.local_postgres stop
```

### If using Supabase/External PostgreSQL

Before running the application, you need to set up the database schema:

```bash
python pixie/setup_db.py
```

This script will:
- Read your `DATABASE_URL` from the `.env` file
- Execute the schema from `pixie/app/db/schema.sql` against your database
- Create all necessary tables, indexes, and triggers

**Note**: The schema file is idempotent - it's safe to run multiple times. It uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` statements, so existing tables won't be affected.

## Troubleshooting

### Docker Issues

**Docker not running:**
- Make sure Docker Desktop is started
- On Linux: `sudo systemctl start docker`

**Port already in use:**
- The default port is 5433. If it's in use, set `DB_PORT` in your `.env` file

### Database Connection Issues

**Local PostgreSQL not connecting:**
- Check if Docker is running: `docker ps`
- Check if the container exists: `docker ps -a | grep pixie-postgres`
- Restart the container: `python -m pixie.app.db.local_postgres setup`

**Supabase connection issues:**
- Verify your `DATABASE_URL` is correct
- Check that your Supabase project is active
- Ensure the connection string uses the transaction pooler port (6543)

### Python/Node Issues

**Python version:**
- Ensure Python 3.10+ is installed: `python3 --version`
- Use `python3` instead of `python` if needed

**pnpm not found:**
- Install pnpm: `npm install -g pnpm`
- Verify: `pnpm --version`

### Frontend Build Issues

**Dependencies not installing:**
- Delete `node_modules` and `pnpm-lock.yaml`
- Run `pnpm install` again

**Port conflicts:**
- Frontend default port: 8080
- Backend default port: 8000
- Change ports in `vite.config.ts` (frontend) or `app/main.py` (backend)

