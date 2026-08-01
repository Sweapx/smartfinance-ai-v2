import logging
import sys
from datetime import datetime
from pathlib import Path

def setup_logging():
    """Configure logging for the application"""
    
    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Create log file with current date
    log_file = log_dir / f"smartfinance_{datetime.now().strftime('%Y%m%d')}.log"
    
    # Configure logging format
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"
    
    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        datefmt=date_format,
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Set specific log levels for different modules
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("tensorflow").setLevel(logging.WARNING)
    
    return logging.getLogger(__name__)
