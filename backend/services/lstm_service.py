"""
Forecasting Service (LSTM)
--------------------------
Bertugas memuat model .keras terlatih dan menjalankan inferensi untuk
memprediksi TOTAL PENGELUARAN BULANAN per kategori bulan berikutnya.

REVISI (fix konsistensi training vs inferensi):
1. Target prediksi sekarang benar-benar "agregat pengeluaran bulanan",
   selaras dengan cara model dilatih di train_lstm.py (lihat FORECAST_WINDOW_DAYS).
   Output model TIDAK lagi dikalikan 30 secara manual -- karena skala target
   saat training sudah representasi rata-rata harian dari window 30 hari,
   sehingga denormalisasi = pred_norm * scaler[category] * 30.
2. Normalisasi input sequence sekarang memakai scaler.pkl (dict per kategori)
   yang disimpan saat training, BUKAN menghitung ulang max_amount dari data
   user saat inferensi. Ini memastikan skala training dan inferensi identik.

Jika model / scaler belum tersedia atau data historis user < 14 hari
(Cold Start), sistem otomatis fallback ke heuristik rata-rata bergerak
(moving average) dari data yang tersedia.
"""

import os
import numpy as np
import pandas as pd

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ai_models", "expense_lstm_model.keras")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "..", "ai_models", "scaler.pkl")

CATEGORIES = ["Food & Beverage", "Transport", "Bills", "Health", "Shopping", "Entertainment", "Education", "Other"]
TIMESTEPS = 7
FORECAST_WINDOW_DAYS = 30  # harus sama dengan train_lstm.py

_model = None
_scaler = None  # dict {category: max_daily_amount}, hasil training
_model_loaded = False


def _try_load_model():
    global _model, _scaler, _model_loaded
    if _model_loaded:
        return
    try:
        import tensorflow as tf
        import joblib
        if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
            _model = tf.keras.models.load_model(MODEL_PATH)
            _scaler = joblib.load(SCALER_PATH)  # dict per kategori
    except Exception as e:
        print(f"[lstm_service] Model belum tersedia, pakai fallback heuristik: {e}")
    finally:
        _model_loaded = True


def _build_sequence(df: pd.DataFrame, category: str, timesteps: int = TIMESTEPS):
    """
    Bangun sequence 7-hari terakhir untuk satu kategori:
    [nominal_norm, is_weekend, is_payday, category_encoded]

    Normalisasi WAJIB memakai scaler[category] dari hasil training,
    bukan max_amount lokal dari data user saat ini, agar konsisten
    dengan skala yang dipelajari model.
    """
    if _scaler is None or category not in _scaler:
        return None

    cat_df = df[df["category"] == category].sort_values("tx_date").tail(timesteps)
    if cat_df.empty:
        return None

    cat_max = _scaler[category] if _scaler[category] > 0 else 1.0
    amounts = cat_df["amount"].values
    normalized = amounts / cat_max

    seq = []
    for i, row in enumerate(cat_df.itertuples()):
        date = pd.to_datetime(row.tx_date)
        is_weekend = 1 if date.weekday() >= 5 else 0
        is_payday = 1 if date.day in (1, 25, 30, 31) else 0
        cat_encoded = CATEGORIES.index(category) / len(CATEGORIES)
        seq.append([normalized[i], is_weekend, is_payday, cat_encoded])

    while len(seq) < timesteps:
        seq.insert(0, [0, 0, 0, CATEGORIES.index(category) / len(CATEGORIES)])

    return np.array(seq[-timesteps:]).reshape(1, timesteps, 4), cat_max


def _heuristic_fallback(df: pd.DataFrame, category: str, days_history: int) -> float:
    """Fallback moving average sederhana ketika model .keras / data belum cukup (Cold Start)."""
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

    predicted_amount = estimasi TOTAL pengeluaran kategori tersebut untuk
    30 hari ke depan (satuan Rupiah, sudah didenormalisasi).
    """
    _try_load_model()

    if not transactions:
        return {"predictions": {c: 0.0 for c in CATEGORIES}, "cold_start": True, "days_history": 0}

    df = pd.DataFrame(transactions)
    df["tx_date"] = pd.to_datetime(df["tx_date"])
    days_history = (df["tx_date"].max() - df["tx_date"].min()).days + 1
    cold_start = days_history < 14

    predictions = {}
    for category in CATEGORIES:
        used_model = False
        if not cold_start and _model is not None and _scaler is not None:
            built = _build_sequence(df, category)
            if built is not None:
                seq, cat_max = built
                try:
                    pred_norm = _model.predict(seq, verbose=0)[0][0]
                    # Denormalisasi: pred_norm merepresentasikan rata-rata harian
                    # ternormalisasi dari window 30 hari (lihat train_lstm.py)
                    predicted_monthly = round(float(pred_norm) * cat_max * FORECAST_WINDOW_DAYS, 0)
                    predictions[category] = max(0.0, predicted_monthly)
                    used_model = True
                except Exception as e:
                    print(f"[lstm_service] Inference error for {category}: {e}")
        if not used_model:
            predictions[category] = _heuristic_fallback(df, category, days_history)

    return {
        "predictions": predictions,
        "cold_start": cold_start,
        "days_history": days_history,
        "total_predicted": sum(predictions.values()),
        "model_used": _model is not None and not cold_start,
    }
