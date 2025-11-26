# Pixie

Create MCP apps easily with an intuitive interface for importing tools, designing widgets, and deploying them.

## 🚀 Quick Start

```bash
# 1. Install dependencies
cd pixie && pip install -r requirements.txt && cd ..
cd frontend && pnpm install && cd ..

# 2. Create .env file
echo "DB_USE_LOCAL=true" > .env

# 3. Run the app
npm run dev
```

That's it! The app will be available at http://localhost:8080

> **Note**: Make sure you have [Docker](https://www.docker.com/products/docker-desktop/) installed and running for the local database. See [Prerequisites](#prerequisites) for installation instructions.

## 📋 Table of Contents

- [What is Pixie?](#what-is-pixie)
- [Prerequisites](#prerequisites)
- [Quick Start](#-quick-start)
- [Detailed Setup](#detailed-setup)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)

## What is Pixie?

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

## Prerequisites

- **Python 3.10+** - [Download](https://www.python.org/downloads/)
- **Node.js and npm** - [Download](https://nodejs.org/)
- **pnpm** - `npm install -g pnpm`
- **Docker** (Recommended) - [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)

<details>
<summary><strong>Docker Installation Details</strong></summary>

**macOS:**
- Download [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
- Or: `brew install --cask docker`

**Linux:**
- Ubuntu/Debian: `sudo apt-get update && sudo apt-get install docker.io`
- Other: See [Docker installation guide](https://docs.docker.com/engine/install/)

**Windows:**
- Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)

Verify: `docker --version`
</details>

## Detailed Setup

### 1. Install Dependencies

**Backend:**
```bash
cd pixie
pip install -r requirements.txt
cd ..
```

**Frontend:**
```bash
cd frontend
pnpm install
cd ..
```

**Root (optional, for npm scripts):**
```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

**Minimal setup (local database):**
```env
DB_USE_LOCAL=true
```

**With LLM support:**
```env
DB_USE_LOCAL=true

# LLM Configuration (optional)
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-your-key
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

**Using Supabase instead:**
```env
DB_USE_LOCAL=false
DATABASE_URL=postgresql://postgres.[DATABASE]:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres
```

### 3. Database Setup

**Local PostgreSQL (automatic):**
- No setup needed! Schema is applied automatically when `DB_USE_LOCAL=true`
- Manual setup: `python -m pixie.app.db.local_postgres setup`
- Stop database: `python -m pixie.app.db.local_postgres stop`

**Supabase/External PostgreSQL:**
```bash
python pixie/setup_db.py
```

## Running the Application

**Recommended (runs both frontend and backend):**
```bash
npm run dev
```

**Or run separately:**

Backend:
```bash
cd pixie
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
pnpm dev
```

**Access:**
- Frontend: http://localhost:8080
- Backend API: http://localhost:8000

## Project Structure

```
pixie/
├── pixie/          # Backend (Python FastAPI)
├── frontend/       # Frontend (React + TypeScript)
└── .env           # Environment configuration
```

## Need Help?

- Check the [detailed setup guide](SETUP.md) for more information
- Review [database configuration options](pixie/app/db/README.md)
- Open an issue on GitHub
