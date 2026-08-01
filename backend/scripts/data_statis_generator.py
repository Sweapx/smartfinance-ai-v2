"""
Data Statis Generator - Cold Start Strategy
--------------------------------------------
Menggunakan Pandas + Faker untuk mensimulasikan transaksi multi-persona
sepanjang N bulan ke belakang, dengan pola is_weekend dan is_payday,
agar model LSTM punya bahan latihan awal (Global Model).

Usage:
    python scripts/data_statis_generator.py --users 5 --months 12 --output statis_data.csv --save-to-db
"""

import argparse
import random
import sys
import os
from datetime import datetime, timedelta

import pandas as pd
from faker import Faker

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

fake = Faker("id_ID")

CATEGORIES = ["Food & Beverage", "Transport", "Bills", "Health", "Shopping", "Entertainment", "Education", "Other"]

PERSONAS = {
    "Mahasiswa": {
        "income_range": (1500000, 3000000),
        "category_weights": {
            "Food & Beverage": 0.30, "Transport": 0.12, "Bills": 0.10, "Health": 0.05,
            "Shopping": 0.15, "Entertainment": 0.15, "Education": 0.10, "Other": 0.03,
        },
        "daily_tx_prob": 0.5,
    },
    "Karyawan": {
        "income_range": (5000000, 9000000),
        "category_weights": {
            "Food & Beverage": 0.20, "Transport": 0.15, "Bills": 0.20, "Health": 0.08,
            "Shopping": 0.12, "Entertainment": 0.10, "Education": 0.05, "Other": 0.10,
        },
        "daily_tx_prob": 0.6,
    },
    "Profesional": {
        "income_range": (10000000, 20000000),
        "category_weights": {
            "Food & Beverage": 0.15, "Transport": 0.10, "Bills": 0.20, "Health": 0.10,
            "Shopping": 0.15, "Entertainment": 0.10, "Education": 0.10, "Other": 0.10,
        },
        "daily_tx_prob": 0.7,
    },
}


def generate_transactions_for_user(user_id: int, persona_name: str, months: int) -> list:
    persona = PERSONAS[persona_name]
    monthly_income = random.randint(*persona["income_range"])
    transactions = []

    start_date = datetime.now() - timedelta(days=months * 30)

    for month_offset in range(months):
        month_start = start_date + timedelta(days=month_offset * 30)

        # Transaksi income (gajian tanggal 25/tanggal payday)
        payday = month_start.replace(day=min(25, 28))
        transactions.append({
            "user_id": user_id, "amount": monthly_income, "category": "Other",
            "type": "income", "tx_date": payday.date().isoformat(),
            "description": "Gaji bulanan",
        })

        # Transaksi expense harian
        for day in range(30):
            current_date = month_start + timedelta(days=day)
            is_weekend = current_date.weekday() >= 5
            is_payday = current_date.day in (1, 25, 30)

            daily_prob = persona["daily_tx_prob"]
            if is_weekend:
                daily_prob += 0.15
            if is_payday:
                daily_prob += 0.20

            if random.random() < daily_prob:
                category = random.choices(
                    list(persona["category_weights"].keys()),
                    weights=list(persona["category_weights"].values()),
                )[0]

                base_amount = monthly_income * persona["category_weights"][category] / 20
                variance = random.uniform(0.5, 1.8)
                amount = round(base_amount * variance, -3)
                amount = max(5000, amount)

                transactions.append({
                    "user_id": user_id, "amount": amount, "category": category,
                    "type": "expense", "tx_date": current_date.date().isoformat(),
                    "description": fake.sentence(nb_words=4),
                })

    return transactions


def main():
    parser = argparse.ArgumentParser(description="Generate statis transaction data untuk SmartFinance AI")
    parser.add_argument("--users", type=int, default=5)
    parser.add_argument("--months", type=int, default=12)
    parser.add_argument("--output", type=str, default="statis_data.csv")
    parser.add_argument("--save-to-db", action="store_true")
    args = parser.parse_args()

    persona_names = list(PERSONAS.keys())
    all_transactions = []

    for user_id in range(1, args.users + 1):
        persona = random.choice(persona_names)
        txs = generate_transactions_for_user(user_id, persona, args.months)
        all_transactions.extend(txs)
        print(f"  User {user_id} ({persona}): {len(txs)} transactions")

    df = pd.DataFrame(all_transactions)
    df.to_csv(args.output, index=False)
    print(f"\nGenerated {len(df)} transactions -> {args.output}")

    if args.save_to_db:
        try:
            from database import SessionLocal, engine, Base
            import models
            from auth import hash_password

            Base.metadata.create_all(bind=engine)
            db = SessionLocal()

            for user_id in range(1, args.users + 1):
                existing = db.query(models.User).filter(models.User.email == f"demo{user_id}@smartfinance.ai").first()
                if existing:
                    continue
                user_income = df[(df["user_id"] == user_id) & (df["type"] == "income")]["amount"].mean()
                user = models.User(
                    name=f"Demo User {user_id}",
                    email=f"demo{user_id}@smartfinance.ai",
                    password_hash=hash_password("demo12345"),
                    monthly_income=float(user_income) if pd.notna(user_income) else 0,
                )
                db.add(user)
                db.commit()
                db.refresh(user)

                user_txs = df[df["user_id"] == user_id]
                for _, row in user_txs.iterrows():
                    tx = models.Transaction(
                        user_id=user.id, amount=row["amount"], category=row["category"],
                        type=row["type"], tx_date=row["tx_date"], description=row["description"],
                    )
                    db.add(tx)
                db.commit()

            print("Data berhasil disimpan ke database.")
            db.close()
        except Exception as e:
            print(f"DB Error: {e}")


if __name__ == "__main__":
    main()
