import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import engine, Base
import models
from routers import auth_router, transaction_router, predict_router, chat_router, budget_router
from logging_config import setup_logging

load_dotenv()

# Setup logging
logger = setup_logging()
logger.info("Starting SmartFinance AI API...")

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SmartFinance AI API",
    description="Dashboard Analitik Keuangan Pribadi - Forecasting (LSTM) + Rule-Based Recommendation (50/30/20) + LLM Chatbot",
    version="2.0.0",
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Configure CORS based on environment
if ENVIRONMENT == "production":
    # Production: Allow specific frontend domain and Azure Static Web Apps
    allowed_origins = [FRONTEND_URL, "https://calm-rock-018756a00.7.azurestaticapps.net"]
else:
    # Development: Allow localhost for testing
    allowed_origins = [FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"]

# Always allow Azure Static Web Apps origin regardless of environment
# This ensures the deployed frontend can always connect to the backend
azure_frontend_url = "https://calm-rock-018756a00.7.azurestaticapps.net"
if azure_frontend_url not in allowed_origins:
    allowed_origins.append(azure_frontend_url)

# Log the allowed origins for debugging
logger.info(f"CORS allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(transaction_router.router)
app.include_router(predict_router.router)
app.include_router(chat_router.router)
app.include_router(budget_router.router)


@app.get("/")
def root():
    return {
        "app": "SmartFinance AI",
        "status": "running",
        "services": ["Forecasting Service (LSTM)", "Recommendation Service (Rule-Based 50/30/20)", "LLM Chatbot Service (Groq)"],
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}
