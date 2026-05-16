#!/bin/bash
# Carcierge startup script

set -e

echo "=== Starting Carcierge ==="

# Start Python backend
echo "Starting Python FastAPI backend on port 8000..."
cd /home/user/Carcierge/backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 3

# Start React frontend
echo "Starting React frontend on port 5173..."
cd /home/user/Carcierge/frontend
npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "=== Carcierge is running ==="
echo "Frontend: http://localhost:5173"
echo "Backend API: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Default accounts:"
echo "  Admin: PartnerPluslogistics@gmail.com / Admin@123"
echo "  User:  Ibrahimzein.03@gmail.com / User@123"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
