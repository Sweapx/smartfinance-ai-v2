#!/bin/bash
# Startup script for Azure App Service

# Install dependencies
pip install -r requirements.txt

# Run the application
python -m uvicorn main:app --host 0.0.0.0 --port 8000
