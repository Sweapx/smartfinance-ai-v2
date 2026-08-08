from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from sqlalchemy import extract

from database import get_db
import models
from auth import get_current_user
from services.lstm_service import predict_monthly_expense, CATEGORIES
from services.recommendation_service import calculate_financial_health, get_top_recommendations
from services.allocation_table import ALLOCATION_TABLE, MAIN_ALLOCATION_SUMMARY

router = APIRouter(prefix="/api/v1/predict", tags=["Forecasting & Recommendation"])


def _get_user_transactions(db: Session, user_id: int):
    txs = db.query(models.Transaction).filter(models.Transaction.user_id == user_id).all()
    return [
        {"amount": float(t.amount), "category": t.category, "type": t.type, "tx_date": t.tx_date.isoformat()}
        for t in txs
    ]


def _estimate_total_income(db: Session, user, transactions: list) -> float:
    """Hitung total pemasukan:
    1. Utama: total transaksi income bulan berjalan
    2. Fallback 1: rata-rata income dari transaksi bulan-bulan sebelumnya (maks 3 bulan)
    3. Fallback 2: monthly_income dari profil user (diset saat registrasi)
    4. Fallback 3: monthly_budget dari profil user jika diset
    """
    now = datetime.now()
    current_month = now.strftime("%Y-%m")

    # Sumber 1: income transaksi bulan berjalan
    current_month_income = sum(
        t["amount"] for t in transactions
        if t["type"] == "income" and t["tx_date"][:7] == current_month
    )
    if current_month_income > 0:
        return current_month_income

    # Sumber 2: rata-rata income dari transaksi historis (maks 3 bulan terakhir)
    income_txs = [t for t in transactions if t["type"] == "income"]
    if income_txs:
        months_with_income = {}
        for t in income_txs:
            month_key = t["tx_date"][:7]
            months_with_income[month_key] = months_with_income.get(month_key, 0) + t["amount"]
        sorted_months = sorted(months_with_income.keys(), reverse=True)[:3]
        if sorted_months:
            avg_income = sum(months_with_income[m] for m in sorted_months) / len(sorted_months)
            return round(avg_income, 0)

    # Sumber 3: fallback ke monthly_income profil user
    if user.monthly_income and float(user.monthly_income) > 0:
        return float(user.monthly_income)

    # Sumber 4: fallback ke monthly_budget profil user jika diset
    if user.monthly_budget and float(user.monthly_budget) > 0:
        return float(user.monthly_budget)

    return 0.0


@router.get("")
def get_prediction(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Forecasting Service -> hasil prediksi LSTM murni per kategori."""
    transactions = _get_user_transactions(db, current_user.id)
    result = predict_monthly_expense(transactions)

    next_month = (datetime.now().replace(day=1) + timedelta(days=32)).strftime("%B %Y")

    predictions_list = []
    for category in CATEGORIES:
        rule = ALLOCATION_TABLE.get(category, {})
        predictions_list.append({
            "category": category,
            "predicted_amount": result["predictions"].get(category, 0),
            "budget_limit": None,
            "status": "safe",
            "message": "",
        })

    return {
        "prediction_month": next_month,
        "cold_start": result["cold_start"],
        "days_history": result["days_history"],
        "total_predicted": result["total_predicted"],
        "predictions": predictions_list,
    }


@router.get("/health-score")
def get_financial_health_score(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Recommendation Service -> Financial Health Score + rekomendasi rule-based berdasarkan 50/30/20."""
    transactions = _get_user_transactions(db, current_user.id)
    forecast = predict_monthly_expense(transactions)
    total_income = _estimate_total_income(db, current_user, transactions)

    health = calculate_financial_health(forecast["predictions"], total_income)
    top_recs = get_top_recommendations(health, limit=5)

    return {
        "score": health["score"],
        "label": health["label"],
        "total_income": total_income,
        "savings_pct": health["savings_pct"],
        "savings_ideal_pct": health["savings_ideal_pct"],
        "savings_status": health["savings_status"],
        "breakdown": health["breakdown"],
        "top_recommendations": top_recs,
        "main_allocation": health["main_allocation"],
        "cold_start": forecast["cold_start"],
    }


@router.get("/dashboard")
def get_dashboard_summary(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Ringkasan gabungan untuk halaman Dashboard: KPI, tren 6 bulan, distribusi kategori, alokasi 50/30/20."""
    now = datetime.now()

    current_month_txs = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        extract("year", models.Transaction.tx_date) == now.year,
        extract("month", models.Transaction.tx_date) == now.month,
    ).all()

    income = sum(float(t.amount) for t in current_month_txs if t.type == "income")
    expense = sum(float(t.amount) for t in current_month_txs if t.type == "expense")

    monthly_trend = []
    for i in range(5, -1, -1):
        target_date = now.replace(day=1) - timedelta(days=i * 30)
        month_txs = db.query(models.Transaction).filter(
            models.Transaction.user_id == current_user.id,
            extract("year", models.Transaction.tx_date) == target_date.year,
            extract("month", models.Transaction.tx_date) == target_date.month,
            models.Transaction.type == "expense",
        ).all()
        monthly_trend.append({
            "month": target_date.strftime("%b"),
            "actual": sum(float(t.amount) for t in month_txs),
        })

    category_breakdown = {}
    for t in current_month_txs:
        if t.type == "expense":
            category_breakdown[t.category] = category_breakdown.get(t.category, 0) + float(t.amount)

    transactions = _get_user_transactions(db, current_user.id)
    total_income = _estimate_total_income(db, current_user, transactions)
    forecast = predict_monthly_expense(transactions)
    health = calculate_financial_health(forecast["predictions"], total_income)

    return {
        "current_month": {"income": income, "expense": expense, "balance": income - expense},
        "monthly_trend": monthly_trend,
        "category_breakdown": [{"category": k, "total": v} for k, v in category_breakdown.items()],
        "financial_health": {"score": health["score"], "label": health["label"]},
        "allocation_breakdown": health["breakdown"],
        "main_allocation": health["main_allocation"],
        "savings_pct": health["savings_pct"],
    }
