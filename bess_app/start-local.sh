#!/bin/bash
# Start PostgreSQL locally (requires postgres installed)
# brew install postgresql

echo "Starting BESS App locally..."

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "Starting PostgreSQL..."
    brew services start postgresql
    sleep 3
fi

# Create database if not exists
psql postgres -c "CREATE USER bess_user WITH PASSWORD 'bess_pass' CREATEDB;" 2>/dev/null || true
psql postgres -c "CREATE DATABASE bess_db OWNER bess_user;" 2>/dev/null || true

echo "Database ready"
echo ""
echo "1. Start backend:   cd backend && python -m uvicorn main:app --reload --port 8000"
echo "2. Start frontend:  cd frontend && npm install && npm run dev"
echo ""
echo "Then open http://localhost:3000"
