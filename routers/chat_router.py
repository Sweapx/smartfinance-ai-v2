import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
import models, schemas
from auth import get_current_user
from services.lstm_service import predict_monthly_expense
from services.recommendation_service import calculate_financial_health, get_top_recommendations
from services.llm_chat_service import build_system_prompt, get_chat_response
from routers.predict_router import _get_user_transactions, _estimate_total_income

router = APIRouter(prefix="/api/v1/chat", tags=["LLM Chatbot"])

# In-memory chat history per session (untuk demo/prototipe - non-persisten)
_chat_sessions: dict = {}


@router.post("", response_model=schemas.ChatResponse)
def chat(payload: schemas.ChatRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    session_id = payload.session_id or str(uuid.uuid4())
    history = _chat_sessions.get(session_id, [])

    transactions = _get_user_transactions(db, current_user.id)
    total_income = _estimate_total_income(db, current_user, transactions)
    forecast = predict_monthly_expense(transactions)
    health = calculate_financial_health(forecast["predictions"], total_income)
    top_recs = get_top_recommendations(health, limit=3)

    system_prompt = build_system_prompt(
        user_name=current_user.name,
        health_result=health,
        predictions=forecast["predictions"],
        top_recommendations=top_recs,
    )

    reply = get_chat_response(payload.message, system_prompt, chat_history=history)

    history.append({"role": "user", "content": payload.message})
    history.append({"role": "assistant", "content": reply})
    _chat_sessions[session_id] = history[-10:]

    return {"reply": reply, "session_id": session_id}
