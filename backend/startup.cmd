@echo off
REM Startup script for Azure App Service (Windows)

REM Set environment variables
set PYTHONPATH=%HOME%\site\wwwroot

REM Create virtual environment if not exists
if not exist "venv" (
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
pip install -r requirements.txt

REM Run the application
python -m uvicorn main:app --host 0.0.0.0 --port %PORT%
