# Pixie

Create MCP apps easily with an intuitive interface for importing tools, designing widgets, and deploying them.

## Workflow

Pixie makes it easy to create MCP apps in three simple steps:

### Step 1: Import tools
Import tools from MCP servers or OpenAPI specifications.

![Import Tools](demo/import.jpg)

### Step 2: Design Apps
Design and customize your widget UI with an intuitive interface.

![Design Widget](demo/design.jpg)

### Step 3: Deploy
Deploy your widget and make it available for use. Follow [OpenAI Apps SDK deployment guide](https://developers.openai.com/apps-sdk/deploy) for ChatGPT-specific instructions.

![Deploy Widget](demo/deploy.jpg)

## Project Structure

This project consists of:
- **Backend**: Python FastAPI application (in `pixie/` directory)
- **Frontend**: React + TypeScript application (in `frontend/` directory)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.10 or higher** - Required for the backend API
- **Node.js and npm** - Required for running the development server
- **pnpm** - Package manager for frontend dependencies (install with `npm install -g pnpm`)
- **Supabase account** - For database hosting (free tier available)

## Setup

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

### 5. Environment Variables

Create a `.env` file in the root directory with the following variables:

#### Required
- `DATABASE_URL` - Supabase connection string (transaction pooler method)

#### LLM Configuration (Optional - for chat functionality)
- `LLM_PROVIDER` - LLM provider to use: `openai` or `claude` (default: `openai`)
- `OPENAI_API_KEY` - Your OpenAI API key (required if using OpenAI)
- `OPENAI_MODEL` - OpenAI model to use
- `ANTHROPIC_API_KEY` - Your Anthropic API key (required if using Claude)
  - **Note**: Environment variable name must be exactly `ANTHROPIC_API_KEY` (case-insensitive)
- `CLAUDE_MODEL` - Claude model to use

#### Example .env file:
```env
DATABASE_URL='postgresql://postgres.[DATABASE]:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres'

# LLM Configuration
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

### 6. Database Setup

Before running the application, you need to set up the database schema in your Supabase database.

#### Option 1: Using the setup script (Recommended)

From the root directory, run:

```bash
python pixie/setup_db.py
```

This script will:
- Read your `DATABASE_URL` from the `.env` file in the root directory
- Execute the schema from `pixie/app/db/schema.sql` against your Supabase database
- Create all necessary tables, indexes, and triggers

You should see a success message when the schema is set up correctly.

#### Option 2: Manual setup via Supabase Dashboard

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `pixie/app/db/schema.sql`
4. Paste and execute the SQL in the SQL Editor

#### Option 3: Using psql command line

If you have `psql` installed and prefer using the command line:

```bash
psql "$DATABASE_URL" -f pixie/app/db/schema.sql
```

**Note**: The schema file is idempotent - it's safe to run multiple times. It uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` statements, so existing tables won't be affected.

## Running the Application

You can run the application in one of the following ways:

### Option 1: Using the dev script (Recommended)

From the root directory:

```bash
./dev.sh
```

This will start both the backend (FastAPI) and frontend (Vite) servers simultaneously.

### Option 2: Using npm scripts from root

From the root directory:

```bash
npm run dev
```

This uses `concurrently` to run both backend and frontend.

### Option 3: Run servers separately

**Backend only:**
```bash
cd pixie
uvicorn app.main:app --reload
```

**Frontend only:**
```bash
cd frontend
pnpm dev
```

## Accessing the Application

Once running:
- **Backend API**: http://localhost:8000
- **Frontend**: http://localhost:8080
