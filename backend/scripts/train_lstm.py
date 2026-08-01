"""
Train LSTM Model - Forecasting Service
----------------------------------------
Melatih model LSTM untuk memprediksi TOTAL PENGELUARAN BULANAN per kategori
berdasarkan sequence 7 hari transaksi terakhir (timesteps=7, features=4).

REVISI (fix konsistensi target prediksi):
Sebelumnya model dilatih untuk memprediksi nominal TRANSAKSI BERIKUTNYA
(1 baris transaksi), lalu saat inferensi hasilnya dikalikan 30 untuk
diklaim sebagai "prediksi bulanan" -- ini tidak konsisten dengan definisi
"Prediksi Pengeluaran Bulanan" pada Bab 1 & Bab 3 skripsi.

Sekarang: setiap sequence 7 hari (X) dipasangkan dengan target (y) berupa
TOTAL pengeluaran kategori tersebut pada periode 30 hari SETELAH sequence
tersebut. Sehingga model benar-benar belajar memproyeksikan agregat bulanan,
bukan transaksi tunggal yang dikali angka konstan.

REVISI (fix normalisasi training vs inferensi):
scaler sekarang disimpan per-kategori dalam bentuk dict {category: max_amount}
dan HARUS dipakai ulang oleh lstm_service.py saat inferensi (bukan menghitung
ulang max_amount dari data user saat itu saja).

Usage:
    python scripts/train_lstm.py --data statis_data.csv --epochs 30
"""

import argparse
import os
import sys
import numpy as np
import pandas as pd
import joblib

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

CATEGORIES = ["Food & Beverage", "Transport", "Bills", "Health", "Shopping", "Entertainment", "Education", "Other"]
TIMESTEPS = 7
FORECAST_WINDOW_DAYS = 30  # target: total pengeluaran 30 hari ke depan


def prepare_sequences(df: pd.DataFrame):
    """
    Bangun sequence (X) dari 7 hari histori transaksi harian per kategori,
    dengan target (y) = total pengeluaran 30 hari ke depan pada kategori yang sama.

    Scaler dihitung PER KATEGORI (bukan global) agar skala nominal antar
    kategori yang berbeda jauh (misal Bills vs Entertainment) tidak saling
    mendistorsi normalisasi.
    """
    df = df[df["type"] == "expense"].copy()
    df["tx_date"] = pd.to_datetime(df["tx_date"])
    df["is_weekend"] = df["tx_date"].dt.weekday >= 5
    df["is_payday"] = df["tx_date"].dt.day.isin([1, 25, 30])
    df["category_encoded"] = df["category"].apply(
        lambda c: CATEGORIES.index(c) / len(CATEGORIES) if c in CATEGORIES else 0
    )

    # Scaler per kategori: {category: max_daily_amount}
    scaler = {}
    for category in CATEGORIES:
        cat_amounts = df[df["category"] == category]["amount"]
        scaler[category] = float(cat_amounts.max()) if len(cat_amounts) > 0 and cat_amounts.max() > 0 else 1.0

    df["amount_norm"] = df.apply(lambda r: r["amount"] / scaler.get(r["category"], 1.0), axis=1)

    X, y = [], []
    for (user_id, category), group in df.groupby(["user_id", "category"]):
        group = group.sort_values("tx_date").reset_index(drop=True)
        values = group[["amount_norm", "is_weekend", "is_payday", "category_encoded"]].values.astype(float)
        dates = group["tx_date"].values
        raw_amounts = group["amount"].values

        for i in range(len(values) - TIMESTEPS):
            seq_end_date = pd.to_datetime(dates[i + TIMESTEPS - 1])
            window_end = seq_end_date + pd.Timedelta(days=FORECAST_WINDOW_DAYS)

            mask = (pd.to_datetime(dates) > seq_end_date) & (pd.to_datetime(dates) <= window_end)
            future_total = raw_amounts[mask].sum()

            if future_total <= 0:
                continue

            cat_scaler = scaler.get(category, 1.0)
            future_total_norm = future_total / (cat_scaler * FORECAST_WINDOW_DAYS)

            X.append(values[i:i + TIMESTEPS])
            y.append(future_total_norm)

    return np.array(X), np.array(y), scaler


def build_model():
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dropout, Dense

    model = Sequential([
        LSTM(64, return_sequences=True, input_shape=(TIMESTEPS, 4)),
        Dropout(0.2),
        LSTM(32, return_sequences=False),
        Dense(1, activation="linear"),
    ])
    model.compile(optimizer="adam", loss="mse", metrics=["mae"])
    return model


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=str, default="statis_data.csv")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=32)
    args = parser.parse_args()

    print(f"Loading data from {args.data}...")
    df = pd.read_csv(args.data)

    print("Preparing sequences (target = agregat pengeluaran bulanan per kategori)...")
    X, y, scaler = prepare_sequences(df)
    print(f"Total sequences: {len(X)}")

    if len(X) < 50:
        print("WARNING: Data terlalu sedikit untuk training yang baik. Tambah --months atau --users saat generate data.")
        return

    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    print("Building LSTM model...")
    model = build_model()
    model.summary()

    print("Training...")
    history = model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=args.epochs,
        batch_size=args.batch_size,
        verbose=1,
    )

    from sklearn.metrics import mean_absolute_error, mean_squared_error
    y_pred = model.predict(X_test).flatten()
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    print(f"\nEvaluasi Model (skala ternormalisasi) -> MAE: {mae:.4f} | RMSE: {rmse:.4f}")

    os.makedirs("ai_models", exist_ok=True)
    model.save("ai_models/expense_lstm_model.keras")
    joblib.dump(scaler, "ai_models/scaler.pkl")
    print("Model tersimpan di ai_models/expense_lstm_model.keras")
    print(f"Scaler per kategori tersimpan di ai_models/scaler.pkl -> {scaler}")


if __name__ == "__main__":
    main()
