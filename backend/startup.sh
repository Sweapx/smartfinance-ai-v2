#!/bin/bash
# Startup script for Azure App Service

# Navigate to backend directory
cd /home/site/wwwroot/backend

# Install dependencies
pip install -r requirements.txt

# Run the application (Azure provides PORT environment variable)
python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
