#!/bin/bash
# Startup script for Azure App Service

# Navigate to backend directory
cd /home/site/wwwroot/backend

# Install dependencies
pip install -r requirements.txt

# Run the application with gunicorn
gunicorn main:app --bind 0.0.0.0:8000 --workers 1 --timeout 120
