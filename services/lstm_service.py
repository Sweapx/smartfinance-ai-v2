"""
Forecasting Service - Heuristic Fallback Mode
----------------------------------------------
TensorFlow removed from production to prevent container startup timeout on
Azure B1 plan (TF is 400MB+ and far exceeds memory/time budget on startup).

Uses heuristic moving-average approach for reliable production forecasting.
"""

import os
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

CATEGORIES = ["Food & Beverage", "Transport", "Bills", "Health", "Shopping", "Entertainment", "Education", "Other"]
FORECAST_WINDOW_DAYS = 30

# Load model globally so it's loaded only once when the server starts
try:
    import tensorflow as tf
    MODEL_PATH = os.path.join(os.path.dirname(__file__), 'lstm_model.h5')
    if os.path.exists(MODEL_PATH):
        LSTM_MODEL = tf.keras.models.load_model(MODEL_PATH)
        logger.info(f"Successfully loaded LSTM model from {MODEL_PATH}")
    else:
        LSTM_MODEL = None
        logger.warning(f"LSTM model file not found at {MODEL_PATH}. Will fallback to heuristic.")
except Exception as e:
    LSTM_MODEL = None
    logger.error(f"Failed to load TensorFlow or the LSTM model: {e}")

def predict_monthly_expense(transactions: list, user_income: float = None) -> dict:
    """
    transactions: list of dict {amount, category, type, tx_date}
    Return: {category: predicted_amount, ...} + metadata
    
    Uses pre-trained LSTM model if available, else falls back to heuristic.
    """
    if not transactions:
        return {"predictions": {c: 0.0 for c in CATEGORIES}, "cold_start": True, "days_history": 0}

    df = pd.DataFrame(transactions)
    df["tx_date"] = pd.to_datetime(df["tx_date"])
    days_history = (df["tx_date"].max() - df["tx_date"].min()).days + 1
    cold_start = days_history < 14

    predictions = {}
    
    if LSTM_MODEL is not None:
        # Use LSTM
        for category in CATEGORIES:
            cat_df = df[(df["category"] == category) & (df["type"] == "expense")].copy()
            if cat_df.empty:
                predictions[category] = 0.0
            else:
                # Group by date to get daily expenses
                daily_expenses = cat_df.groupby('tx_date')['amount'].sum().reset_index()
                
                # We need exactly 30 days of history for the model
                # Create a date range of the last 30 days up to the max tx_date
                end_date = df["tx_date"].max()
                start_date = end_date - pd.Timedelta(days=29)
                date_range = pd.date_range(start=start_date, end=end_date)
                
                # Merge to ensure we have all 30 days, fill missing with 0
                history_df = pd.DataFrame({'tx_date': date_range})
                history_df = history_df.merge(daily_expenses, on='tx_date', how='left').fillna(0)
                
                # Prepare input shape (1, 30, 1)
                X_input = history_df['amount'].values.reshape(1, 30, 1)
                
                # Predict
                pred = LSTM_MODEL.predict(X_input, verbose=0)
                predicted_val = max(0.0, float(pred[0][0]))
                predictions[category] = round(predicted_val, 0)
                
        model_used = True
    else:
        # Fallback to heuristic
        for category in CATEGORIES:
            cat_df = df[(df["category"] == category) & (df["type"] == "expense")]
            if cat_df.empty:
                predictions[category] = 0.0
            else:
                total = cat_df["amount"].sum()
                days_span = max(1, days_history)
                daily_avg = total / days_span
                predictions[category] = round(daily_avg * FORECAST_WINDOW_DAYS, 0)
        
        model_used = False

    return {
        "predictions": predictions,
        "cold_start": cold_start,
        "days_history": days_history,
        "total_predicted": sum(predictions.values()),
        "model_used": model_used,
    }
