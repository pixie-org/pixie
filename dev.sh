#!/bin/bash

# Script to run both backend and frontend simultaneously

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Pixie development servers...${NC}\n"

# Function to handle cleanup on exit
cleanup() {
    echo -e "\n${BLUE}Shutting down servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Set up trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Start backend
echo -e "${GREEN}Starting backend (FastAPI)...${NC}"
cd pixie
uvicorn app.main:app --reload &
BACKEND_PID=$!
cd ..

# Start frontend
echo -e "${GREEN}Starting frontend (Vite)...${NC}"
cd frontend
pnpm dev &
FRONTEND_PID=$!
cd ..

echo -e "\n${BLUE}Both servers are running!${NC}"
echo -e "${BLUE}Backend: http://localhost:8000${NC}"
echo -e "${BLUE}Frontend: http://localhost:8080${NC}"
echo -e "\n${BLUE}Press Ctrl+C to stop both servers${NC}\n"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

