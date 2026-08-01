#!/bin/bash
# Startup script for Azure App Service

# Set environment variables
export PYTHONPATH="/home/site/wwwroot/backend"

# Navigate to backend directory
cd /home/site/wwwroot/backend

# Install dependencies if needed
if [ ! -d "venv" ]; then
    python -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Run the application
python -m uvicorn main:app --host 0.0.0.0 --port $PORT
