"""
Forecasting Service (LSTM) - Heuristic Fallback Mode
------------------------------------------------------
TensorFlow has been removed from the production environment to reduce startup
time (TF is 400MB+ and causes Azure B1 container to time out).

This service uses a heuristic moving-average approach which is accurate and
fast for production use.
"""

import numpy as np
import pandas as pd

CATEGORIES = ["Food & Beverage", "Transport", "Bills", "Health", "Shopping", "Entertainment", "Education", "Other"]
FORECAST_WINDOW_DAYS = 30


def _heuristic_fallback(df: pd.DataFrame, category: str, days_history: int) -> float:
    """Moving average fallback for expense forecasting."""
    cat_df = df[(df["category"] == category) & (df["type"] == "expense")]
    if cat_df.empty:
        return 0.0
    total = cat_df["amount"].sum()
    days_span = max(1, days_history)
    daily_avg = total / days_span
    return round(daily_avg * FORECAST_WINDOW_DAYS, 0)


def predict_monthly_expense(transactions: list, user_income: float = None) -> dict:
    """
    transactions: list of dict {amount, category, type, tx_date}
    Return: {category: predicted_amount, ...} + metadata cold_start flag

    predicted_amount = estimated total expense for each category for next 30 days.
    Uses heuristic moving-average (fast, reliable, no heavy ML dependency).
    """
    if not transactions:
        return {"predictions": {c: 0.0 for c in CATEGORIES}, "cold_start": True, "days_history": 0}

    df = pd.DataFrame(transactions)
    df["tx_date"] = pd.to_datetime(df["tx_date"])
    days_history = (df["tx_date"].max() - df["tx_date"].min()).days + 1
    cold_start = days_history < 14

    predictions = {}
    for category in CATEGORIES:
        predictions[category] = _heuristic_fallback(df, category, days_history)

    return {
        "predictions": predictions,
        "cold_start": cold_start,
        "days_history": days_history,
        "total_predicted": sum(predictions.values()),
        "model_used": False,
    }
