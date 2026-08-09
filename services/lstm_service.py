"""
Forecasting Service - Heuristic Fallback Mode
----------------------------------------------
TensorFlow removed from production to prevent container startup timeout on
Azure B1 plan (TF is 400MB+ and far exceeds memory/time budget on startup).

Uses heuristic moving-average approach for reliable production forecasting.
"""

import pandas as pd

CATEGORIES = ["Food & Beverage", "Transport", "Bills", "Health", "Shopping", "Entertainment", "Education", "Other"]
FORECAST_WINDOW_DAYS = 30


def predict_monthly_expense(transactions: list, user_income: float = None) -> dict:
    """
    transactions: list of dict {amount, category, type, tx_date}
    Return: {category: predicted_amount, ...} + metadata cold_start flag

    Uses heuristic moving-average: total past expense / days * 30 days.
    """
    if not transactions:
        return {"predictions": {c: 0.0 for c in CATEGORIES}, "cold_start": True, "days_history": 0}

    df = pd.DataFrame(transactions)
    df["tx_date"] = pd.to_datetime(df["tx_date"])
    days_history = (df["tx_date"].max() - df["tx_date"].min()).days + 1
    cold_start = days_history < 14

    predictions = {}
    for category in CATEGORIES:
        cat_df = df[(df["category"] == category) & (df["type"] == "expense")]
        if cat_df.empty:
            predictions[category] = 0.0
        else:
            total = cat_df["amount"].sum()
            days_span = max(1, days_history)
            daily_avg = total / days_span
            predictions[category] = round(daily_avg * FORECAST_WINDOW_DAYS, 0)

    return {
        "predictions": predictions,
        "cold_start": cold_start,
        "days_history": days_history,
        "total_predicted": sum(predictions.values()),
        "model_used": False,
    }
