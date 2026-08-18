"""
Forecasting Service (LSTM)
--------------------------
Menerapkan arsitektur dan alur logika persis seperti Bab 3.
Menggunakan model .keras dan scaler .pkl.
"""

import os
import numpy as np
import pandas as pd
import joblib
import logging

logger = logging.getLogger(__name__)

CATEGORIES = ["Food & Beverage", "Transport", "Bills", "Health", "Shopping", "Entertainment", "Education", "Other"]
FORECAST_WINDOW_DAYS = 30
TIMESTEPS = 7

# Load model and scaler globally
try:
    import tensorflow as tf
    MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ai_models', 'expense_lstm_model.keras')
    SCALER_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ai_models', 'scaler.pkl')
    
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        LSTM_MODEL = tf.keras.models.load_model(MODEL_PATH)
        SCALER = joblib.load(SCALER_PATH)
        logger.info(f"Successfully loaded LSTM model and scaler from {MODEL_PATH}")
    else:
        LSTM_MODEL = None
        SCALER = None
        logger.warning(f"LSTM model or scaler not found. Will fallback to heuristic.")
except Exception as e:
    LSTM_MODEL = None
    SCALER = None
    logger.error(f"Failed to load TensorFlow, LSTM model, or scaler: {e}")


def _heuristic_fallback(df: pd.DataFrame, category: str, days_history: int) -> float:
    """Moving average fallback for expense forecasting (kondisi cold_start)."""
    cat_df = df[(df["category"] == category) & (df["type"] == "expense")]
    if cat_df.empty:
        return 0.0
    total = cat_df["amount"].sum()
    days_span = max(1, days_history)
    daily_avg = total / days_span
    return round(daily_avg * FORECAST_WINDOW_DAYS, 0)


def build_sequence(cat_df: pd.DataFrame, category: str, scaler: dict) -> np.ndarray:
    """
    Membangun sequence 7 langkah waktu dengan 4 fitur:
    amount_norm, is_weekend, is_payday, category_encoded
    """
    cat_df = cat_df.sort_values("tx_date").tail(TIMESTEPS).copy()
    
    # Jika transaksi kurang dari TIMESTEPS, pad dengan nol di awal
    pad_length = TIMESTEPS - len(cat_df)
    
    cat_df["is_weekend"] = (cat_df["tx_date"].dt.weekday >= 5).astype(float)
    cat_df["is_payday"] = (cat_df["tx_date"].dt.day.isin([1, 25, 30])).astype(float)
    category_encoded = CATEGORIES.index(category) / len(CATEGORIES) if category in CATEGORIES else 0.0
    cat_df["category_encoded"] = category_encoded
    
    cat_scaler = scaler.get(category, 1.0)
    cat_df["amount_norm"] = cat_df["amount"] / cat_scaler
    
    values = cat_df[["amount_norm", "is_weekend", "is_payday", "category_encoded"]].values.astype(float)
    
    if pad_length > 0:
        padding = np.zeros((pad_length, 4))
        # pad category_encoded with the correct value
        padding[:, 3] = category_encoded
        values = np.vstack([padding, values])
        
    return values.reshape(1, TIMESTEPS, 4)


def predict_monthly_expense(transactions: list, user_income: float = None) -> dict:
    """
    Menerapkan logika prediksi Bab 3:
    1. Cek cold_start (< 14 hari)
    2. Fallback heuristik jika cold start atau model tidak ada
    3. Normalisasi, build sequence, predict, denormalisasi jika model ada.
    """
    if not transactions:
        return {
            "predictions": {c: 0.0 for c in CATEGORIES}, 
            "cold_start": True, 
            "days_history": 0,
            "total_predicted": 0.0,
            "model_used": False
        }

    df = pd.DataFrame(transactions)
    df["tx_date"] = pd.to_datetime(df["tx_date"])
    days_history = (df["tx_date"].max() - df["tx_date"].min()).days + 1
    
    # Sesuai Bab 3: Jika < 14 hari, cold_start = True
    cold_start = days_history < 14

    predictions = {}
    model_used = False
    
    if not cold_start and LSTM_MODEL is not None and SCALER is not None:
        model_used = True
        for category in CATEGORIES:
            cat_df = df[(df["category"] == category) & (df["type"] == "expense")].copy()
            if cat_df.empty:
                predictions[category] = 0.0
            else:
                X_seq = build_sequence(cat_df, category, SCALER)
                # Predict returns normalized future 30-day total
                pred_norm = float(LSTM_MODEL.predict(X_seq, verbose=0)[0][0])
                pred_norm = max(0.0, pred_norm)
                
                # Denormalization: pred_norm * scaler[category] * 30
                cat_scaler = SCALER.get(category, 1.0)
                predicted_val = pred_norm * cat_scaler * FORECAST_WINDOW_DAYS
                predictions[category] = round(predicted_val, 0)
    else:
        # Fallback to heuristic moving average
        model_used = False
        for category in CATEGORIES:
            predictions[category] = _heuristic_fallback(df, category, days_history)

    return {
        "predictions": predictions,
        "cold_start": cold_start,
        "days_history": days_history,
        "total_predicted": sum(predictions.values()),
        "model_used": model_used,
    }
