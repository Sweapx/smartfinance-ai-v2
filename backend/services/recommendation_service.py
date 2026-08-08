"""
Recommendation Service (Rule-Based)
------------------------------------
Menerima hasil prediksi LSTM (nominal Rupiah per kategori) + total pemasukan pengguna,
lalu menghasilkan:
1. Financial Health Score (0-100)
2. Rekomendasi otomatis per kategori (bahasa natural, rule-based)
3. Breakdown alokasi 50/30/20 (aktual vs ideal)

Rumus Financial Health Score:
    score = 100 - total(penalty)
    penalty per kategori (tier tunggal - ambil yang tertinggi terlampaui):
        - lewat ideal   -> -5
        - lewat warning -> -10
        - lewat kritis  -> -15
"""

from services.allocation_table import (
    ALLOCATION_TABLE,
    SAVINGS_IDEAL_PCT,
    MAIN_ALLOCATION_SUMMARY,
    get_allocation_rule,
)


def _status_and_penalty(actual_pct: float, rule: dict) -> tuple[str, int]:
    """Mengembalikan (status, penalty) berdasarkan tier tertinggi yang terlampaui.
    
    Untuk kategori normal (inverse=False): semakin besar actual_pct = semakin buruk.
    Untuk kategori inverse (inverse=True, mis. Education): semakin kecil actual_pct = semakin buruk.
    """
    is_inverse = rule.get("inverse", False)
    
    if is_inverse:
        # Education: semakin kecil pengeluaran = semakin buruk
        # actual_pct < critical (0%) -> danger (tidak ada pengeluaran sama sekali)
        # actual_pct < warning (5%) -> caution (di bawah batas ideal)
        # actual_pct >= ideal (5%) -> safe
        if actual_pct <= rule["critical"]:
            return "danger", -15
        if actual_pct < rule["warning"]:
            return "caution", -5
        return "safe", 0
    else:
        # Kategori normal: semakin besar pengeluaran = semakin buruk
        if actual_pct > rule["critical"]:
            return "danger", -15
        if actual_pct > rule["warning"]:
            return "warning", -10
        if actual_pct > rule["ideal"]:
            return "caution", -5
        return "safe", 0


def _score_label(score: int) -> str:
    if score >= 80:
        return "Sehat"
    if score >= 60:
        return "Cukup Sehat"
    if score >= 40:
        return "Kurang Sehat"
    return "Tidak Sehat"


def generate_recommendation_text(category: str, actual_pct: float, ideal_pct: float, status: str, is_inverse: bool = False) -> str:
    if is_inverse:
        # Education: kurang pengeluaran = buruk
        shortfall = round(ideal_pct - actual_pct, 1)
        if status == "safe":
            return f"Pengeluaran {category} Anda {actual_pct}%, sudah memenuhi batas ideal minimal {ideal_pct}%. Pertahankan!"
        if status == "danger":
            return (f"Pengeluaran {category} Anda {actual_pct}%, belum ada alokasi sama sekali. "
                    f"Segera alihkan minimal {ideal_pct}% pemasukan untuk investasi pendidikan.")
        return (f"Pengeluaran {category} Anda {actual_pct}%, masih di bawah rekomendasi minimal {ideal_pct}%. "
                f"Tingkatkan sekitar {shortfall}% agar sesuai target alokasi pendidikan.")
    else:
        excess = round(actual_pct - ideal_pct, 1)
        if status == "safe":
            return f"Pengeluaran {category} Anda {actual_pct}%, masih dalam batas ideal ({ideal_pct}%). Pertahankan kebiasaan ini!"
        if status == "danger":
            return (f"Pengeluaran {category} Anda {actual_pct}% sudah masuk kategori KRITIS "
                    f"(melebihi batas aman {ideal_pct}% sebesar {excess}%). Segera evaluasi dan kurangi pengeluaran ini bulan depan.")
        return (f"Pengeluaran {category} Anda {actual_pct}%, melebihi rekomendasi {ideal_pct}%. "
                f"Kurangi sekitar {excess}% dan alihkan ke tabungan atau kebutuhan prioritas.")


def calculate_financial_health(category_amounts: dict, total_income: float) -> dict:
    """
    category_amounts: dict {kategori: nominal_prediksi_atau_aktual}
    total_income: total pemasukan bulanan pengguna (Rupiah)

    Return:
        {
            "score": int,
            "label": str,
            "total_penalty": int,
            "breakdown": [ {category, actual_pct, ideal_pct, warning_pct, critical_pct, status, recommendation}, ... ],
            "savings_pct": float,
            "main_allocation": {...}
        }
    """
    if total_income <= 0:
        default_breakdown = []
        for category, rule in ALLOCATION_TABLE.items():
            default_breakdown.append({
                "category": category,
                "tipe": rule["tipe"],
                "actual_pct": 0.0,
                "ideal_pct": rule["ideal"],
                "warning_pct": rule["warning"],
                "critical_pct": rule["critical"],
                "status": "safe",
                "inverse": rule.get("inverse", False),
                "recommendation": f"Pengeluaran {category} belum tercatat. Pertahankan di bawah batas ideal ({rule['ideal']}%).",
            })
        return {
            "score": 100,
            "label": "Data Belum Cukup",
            "total_penalty": 0,
            "breakdown": default_breakdown,
            "savings_pct": 0.0,
            "savings_ideal_pct": SAVINGS_IDEAL_PCT,
            "savings_status": "safe",
            "main_allocation": MAIN_ALLOCATION_SUMMARY,
        }

    breakdown = []
    total_penalty = 0
    total_expense_pct = 0

    for category, rule in ALLOCATION_TABLE.items():
        amount = category_amounts.get(category, 0)
        actual_pct = round((amount / total_income) * 100, 1)
        is_inverse = rule.get("inverse", False)
        
        # Untuk kategori inverse (Education), jangan dihitung ke total_expense_pct
        # karena Education harusnya DITINGKATKAN, bukan dikurangi
        if not is_inverse:
            total_expense_pct += actual_pct
        else:
            # Education: tetap masuk total expense (berdampak ke savings)
            total_expense_pct += actual_pct

        status, penalty = _status_and_penalty(actual_pct, rule)
        total_penalty += penalty

        recommendation = generate_recommendation_text(category, actual_pct, rule["ideal"], status, is_inverse)

        breakdown.append({
            "category": category,
            "tipe": rule["tipe"],
            "actual_pct": actual_pct,
            "ideal_pct": rule["ideal"],
            "warning_pct": rule["warning"],
            "critical_pct": rule["critical"],
            "status": status,
            "inverse": is_inverse,
            "recommendation": recommendation,
        })

    savings_pct = round(100 - total_expense_pct, 1)
    score = max(0, 100 - abs(total_penalty))
    label = _score_label(score)

    # Penalty tambahan jika tabungan di bawah ideal 20%
    savings_status = "safe"
    if savings_pct < SAVINGS_IDEAL_PCT * 0.5:
        savings_status = "danger"
        score = max(0, score - 15)
    elif savings_pct < SAVINGS_IDEAL_PCT:
        savings_status = "warning"
        score = max(0, score - 5)

    label = _score_label(score)

    return {
        "score": score,
        "label": label,
        "total_penalty": total_penalty,
        "breakdown": sorted(breakdown, key=lambda x: x["actual_pct"], reverse=True),
        "savings_pct": savings_pct,
        "savings_ideal_pct": SAVINGS_IDEAL_PCT,
        "savings_status": savings_status,
        "main_allocation": MAIN_ALLOCATION_SUMMARY,
    }


def get_top_recommendations(health_result: dict, limit: int = 3) -> list:
    """Ambil rekomendasi paling kritis untuk ditampilkan di dashboard / dikirim ke chatbot."""
    issues = [b for b in health_result["breakdown"] if b["status"] != "safe"]
    issues.sort(key=lambda x: (x["status"] != "danger", -(x["actual_pct"] - x["ideal_pct"])))
    return issues[:limit]
