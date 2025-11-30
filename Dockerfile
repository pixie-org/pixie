# Multi-stage Dockerfile for Pixie
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package.json frontend/pnpm-lock.yaml ./

# Install frontend dependencies
RUN pnpm install --frozen-lockfile

# Copy frontend source code
COPY frontend/ ./

# Build frontend (produces static files in dist/)
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN pnpm build

# Build client SDK
RUN pnpm build:client-sdk

# Stage 2: Python backend
FROM python:3.12-slim AS backend

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements
COPY pixie/requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY pixie/ ./pixie/

# Copy built frontend static files from frontend-builder stage
# The dist/ folder contains the built frontend
COPY --from=frontend-builder /app/frontend/dist ./static

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 8000

ENV PYTHONPATH=/app/pixie

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

