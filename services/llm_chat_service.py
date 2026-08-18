"""
LLM Chatbot Service
--------------------
Menerima hasil prediksi (Forecasting Service) dan rekomendasi + Financial Health Score
(Recommendation Service) sebagai konteks, lalu menyusun jawaban bahasa natural
melalui Groq API. Chatbot ini HANYA berfungsi sebagai media interaksi —
tidak menghasilkan angka atau rekomendasi sendiri (mencegah halusinasi).
"""

import os
import json
from groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


def build_system_prompt(user_name: str, health_result: dict, predictions: dict, top_recommendations: list) -> str:
    breakdown_text = "\n".join([
        f"- {b['category']}: aktual {b['actual_pct']}% (ideal {b['ideal_pct']}%, status: {b['status']})"
        for b in health_result.get("breakdown", [])
    ])
    recs_text = "\n".join([f"- {r['recommendation']}" for r in top_recommendations]) or "Tidak ada isu kritis saat ini."

    return f"""Anda adalah SmartFinance Advisor, asisten keuangan pribadi untuk {user_name}.

ATURAN MUTLAK:
1. HANYA gunakan data numerik yang diberikan di bawah ini. JANGAN membuat angka, saran investasi, atau prediksi yang tidak berdasar dari data ini.
2. Financial Health Score pengguna saat ini: {health_result.get('score', 0)}/100 ({health_result.get('label', '-')}).
3. Alokasi tabungan aktual: {health_result.get('savings_pct', 0)}% (ideal minimal {health_result.get('savings_ideal_pct', 20)}%).

DATA BREAKDOWN ALOKASI 50/30/20 PENGGUNA:
{breakdown_text}

REKOMENDASI PRIORITAS (rule-based, berdasarkan framework 50/30/20 - Warren & Tyagi, 2005):
{recs_text}

PREDIKSI PENGELUARAN BULAN DEPAN (hasil model LSTM):
{json.dumps(predictions, indent=2)}

Jawablah pertanyaan pengguna dengan ramah, ringkas (maksimal 4-5 kalimat), gunakan Bahasa Indonesia santai namun sopan,
dan selalu kaitkan jawaban dengan data di atas. Jangan memberi saran investasi spesifik (saham/kripto tertentu).
Jika ditanya di luar topik keuangan, arahkan kembali dengan sopan ke topik keuangan pengguna."""


def get_chat_response(user_message: str, system_prompt: str, chat_history: list = None) -> str:
    if _client is None:
        return _fallback_response(user_message)

    messages = [{"role": "system", "content": system_prompt}]
    if chat_history:
        messages.extend(chat_history[-6:])
    messages.append({"role": "user", "content": user_message})

    try:
        response = _client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.4,
            max_tokens=400,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"[llm_chat_service] Groq API error: {e}")
        return _fallback_response(user_message)


def _fallback_response(user_message: str) -> str:
    return ("Maaf, saya sedang tidak dapat terhubung ke layanan AI (Groq API). "
            "Pastikan GROQ_API_KEY sudah dikonfigurasi di file .env server. "
            "Sementara itu, Anda tetap dapat melihat Financial Health Score dan rekomendasi di Dashboard.")
