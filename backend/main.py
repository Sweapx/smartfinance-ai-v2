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

try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    logger.warning(f"Database table creation note: {e}")

app = FastAPI(
    title="SmartFinance AI API",
    description="Dashboard Analitik Keuangan Pribadi - Forecasting (LSTM) + Rule-Based Recommendation (50/30/20) + LLM Chatbot",
    version="2.0.0",
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "*")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

allowed_origins = [
    "*",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://calm-rock-018756a00.7.azurestaticapps.net",
    "https://smartfinance-frontend.azurestaticapps.net",
]
if FRONTEND_URL and FRONTEND_URL != "*":
    allowed_origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        "services": [
            "Forecasting Service (LSTM)",
            "Recommendation Service (Rule-Based 50/30/20)",
            "LLM Chatbot Service (Groq)",
        ],
    }


@app.get("/health")
def health():
    return {"status": "ok"}
