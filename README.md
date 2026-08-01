# SmartFinance AI v2.0

Dashboard Analitik Keuangan Pribadi dengan 3 layanan AI terintegrasi:

1. **Forecasting Service (LSTM)** — memprediksi nominal pengeluaran bulan depan per kategori berdasarkan data historis time-series.
2. **Recommendation Service (Rule-Based)** — menghitung Financial Health Score dan rekomendasi otomatis berdasarkan framework 50/30/20 (Warren & Tyagi, 2005) dan POJK No. 76/POJK.07/2016.
3. **LLM Chatbot Service** — menyampaikan hasil prediksi dan rekomendasi dalam bahasa natural via Groq API.

## Arsitektur

```
React UI (Frontend)
   |
   v (JSON/JWT)
FastAPI Engine (Backend)
   |-- Forecasting Service   -> LSTM (.keras)
   |-- Recommendation Service -> Rule-Based 50/30/20
   |-- LLM Chatbot Service    -> Groq API
   |
   v
MySQL (users, transactions)
```

## Tabel Alokasi 50/30/20 (Profil Umum)

| Kategori | Tipe | Ideal | Warning | Kritis |
|---|---|---|---|---|
| Food & Beverage | Needs | ≤15% | 15-20% | >25% |
| Transport | Needs | ≤10% | 10-15% | >20% |
| Bills | Needs | ≤15% | 15-20% | >25% |
| Health | Needs | ≤10% | 10-15% | >20% |
| Shopping | Wants | ≤10% | 10-15% | >20% |
| Entertainment | Wants | ≤5% | 5-10% | >15% |
| Education | Wants | ≤5% | 5-10% | >15% |
| Other | Fleksibel | ≤5% | 5-10% | >15% |
| **Tabungan** | Savings | ≥20% | 10-20% | <10% |

## Financial Health Score

```
score = 100 - total(penalty)

Penalty per kategori (ambil tier tertinggi):
- Lewat ideal   -> -5
- Lewat warning -> -10
- Lewat kritis  -> -15

Label:
80-100 = Sehat | 60-79 = Cukup Sehat | 40-59 = Kurang Sehat | <40 = Tidak Sehat
```

## Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # isi DATABASE_URL, GROQ_API_KEY, SECRET_KEY

# Generate data statis (Cold Start Strategy) + training model
python scripts/data_statis_generator.py --users 5 --months 12 --output statis_data.csv --save-to-db
python scripts/train_lstm.py --data statis_data.csv --epochs 30

uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Endpoint Utama

| Endpoint | Service | Fungsi |
|---|---|---|
| `POST /api/v1/auth/register` | Auth | Registrasi user + set monthly_income |
| `GET /api/v1/predict` | Forecasting | Prediksi LSTM murni per kategori |
| `GET /api/v1/predict/health-score` | Recommendation | Financial Health Score + breakdown alokasi |
| `GET /api/v1/predict/dashboard` | Gabungan | Data lengkap untuk halaman Dashboard |
| `POST /api/v1/chat` | LLM Chatbot | Chat dengan konteks prediksi + rekomendasi |

## Kredensial Demo (setelah generate data)

```
Email: demo1@smartfinance.ai
Password: demo12345
```
