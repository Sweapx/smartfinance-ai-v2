"""
Tabel Alokasi Pengeluaran — Profil "Umum" (50/30/20)
Diadaptasi dari framework 50/30/20 (Warren & Tyagi, 2005).

8 Kategori baku sesuai Bab 1 Ruang Lingkup Penelitian:
Food & Beverage, Transport, Entertainment, Bills, Health, Shopping, Education, Other.

Struktur:
- ideal: batas persentase ideal dari total pemasukan bulanan
- warning: ambang peringatan (di atas ideal, di bawah kritis)
- critical: ambang kritis / bahaya (di atas warning)
- tipe: klasifikasi Needs (kebutuhan) / Wants (keinginan) / Savings (tabungan)

REVISI (fix konsistensi 50/30/20):
Kategori "Other" sebelumnya diberi tipe "Fleksibel" dan tidak dihitung ke
kelompok manapun, sehingga total Needs+Wants+Savings hanya 95% (bukan 100%).
Sekarang "Other" dimasukkan ke kelompok Wants dengan porsi 10%, sehingga:
    Needs  = 15+10+15+10           = 50%
    Wants  = 10+5+5+10 (Other)     = 30%
    Savings                        = 20%
    TOTAL                          = 100%
"""

ALLOCATION_TABLE = {
    # Kategori standar: semakin besar pengeluaran = semakin buruk
    "Bills":            {"ideal": 35, "warning": 45, "critical": 100, "tipe": "Needs", "inverse": False},
    "Food & Beverage": {"ideal": 15, "warning": 20, "critical": 100, "tipe": "Needs", "inverse": False},
    "Health":           {"ideal": 10, "warning": 15, "critical": 100, "tipe": "Needs", "inverse": False},
    "Transport":        {"ideal": 10, "warning": 20, "critical": 100, "tipe": "Needs", "inverse": False},
    "Shopping":         {"ideal": 10, "warning": 15, "critical": 100, "tipe": "Wants", "inverse": False},
    "Entertainment":    {"ideal": 10, "warning": 15, "critical": 100, "tipe": "Wants", "inverse": False},
    # Education bersifat terbalik: semakin kecil pengeluaran = semakin buruk
    # ideal: 5-10%, waspada: < 5% (belum memenuhi batas ideal)
    "Education":        {"ideal": 5,  "warning": 5,  "critical": 0,   "tipe": "Wants", "inverse": True},
    "Other":            {"ideal": 5,  "warning": 10, "critical": 100, "tipe": "Wants", "inverse": False},
}


# Alokasi tabungan/investasi minimal sesuai profil Umum 50/30/20
SAVINGS_IDEAL_PCT = 20

# Ringkasan pos utama 50/30/20 (dipakai untuk pie chart alokasi dana di dashboard)
# Total: Needs 50% + Wants 30% + Savings 20% = 100%
MAIN_ALLOCATION_SUMMARY = {
    "Kebutuhan (Needs)":  {"pct": 50, "categories": ["Food & Beverage", "Transport", "Bills", "Health"]},
    "Keinginan (Wants)":  {"pct": 30, "categories": ["Shopping", "Entertainment", "Education", "Other"]},
    "Tabungan (Savings)": {"pct": 20, "categories": []},
}

CATEGORY_LIST = list(ALLOCATION_TABLE.keys())


def get_allocation_rule(category: str) -> dict:
    return ALLOCATION_TABLE.get(category, {"ideal": 10, "warning": 15, "critical": 20, "tipe": "Wants"})


def validate_allocation_total():
    """Sanity check: total ideal Needs+Wants+Savings harus 100%."""
    needs = sum(v["ideal"] for v in ALLOCATION_TABLE.values() if v["tipe"] == "Needs")
    wants = sum(v["ideal"] for v in ALLOCATION_TABLE.values() if v["tipe"] == "Wants")
    total = needs + wants + SAVINGS_IDEAL_PCT
    assert total == 100, f"Total alokasi tidak 100%! Needs={needs} Wants={wants} Savings={SAVINGS_IDEAL_PCT} Total={total}"
    return {"needs": needs, "wants": wants, "savings": SAVINGS_IDEAL_PCT, "total": total}
