@echo off
echo Starting AssessMate...

echo Starting Next.js Frontend...
start cmd /k "cd frontend && npm run dev"

echo Starting FastAPI Backend...
start cmd /k "cd backend && call venv\Scripts\activate && uvicorn main:app --reload"

echo Both servers are starting up!
