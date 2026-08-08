import React, { useEffect, useState } from "react";
import { RefreshCw, Info, CheckCircle2, XCircle, AlertCircle, AlertTriangle } from "lucide-react";
import api from "../utils/api";
import { STATUS_LABEL } from "../utils/format";

const StatusDot = ({ status }) => {
  const colorMap = {
    excellent: "bg-emerald-500",
    safe: "bg-emerald-500",
    caution: "bg-yellow-500",
    warning: "bg-yellow-500",
    danger: "bg-red-500",
    critical: "bg-red-500",
  };
  const dotColor = colorMap[status] || "bg-emerald-500";
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#f9f8f5] text-[#28251d] border border-[#e5e3df]">
      <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
      {STATUS_LABEL[status] || "Aman"}
    </span>
  );
};

// Aturan tampilan per kategori untuk kolom Ideal / Waspada / Kritis
const CATEGORY_DISPLAY_RULES = {
  Bills: { ideal: "≤15%", warning: "15–20%", critical: ">20%", inverse: false },
  "Food & Beverage": { ideal: "≤15%", warning: "15–20%", critical: ">20%", inverse: false },
  Health: { ideal: "≤10%", warning: "10–15%", critical: ">15%", inverse: false },
  Transport: { ideal: "≤10%", warning: "10–20%", critical: ">20%", inverse: false },
  Shopping: { ideal: "≤10%", warning: "10–15%", critical: ">15%", inverse: false },
  Entertainment: { ideal: "≤10%", warning: "10–15%", critical: ">15%", inverse: false },
  // Education bersifat terbalik: semakin kecil pengeluaran = semakin buruk
  Education: { ideal: "≥5%", warning: "0–5%", critical: "0%", inverse: true },
  Other: { ideal: "≤5%", warning: "5–10%", critical: ">10%", inverse: false },
};

export default function AllocationPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get("/predict/health-score");
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const breakdown = data?.breakdown || [];
  const needsItems = breakdown.filter((b) => b.tipe === "Needs");
  const wantsItems = breakdown.filter((b) => b.tipe === "Wants");

  const needsActual = needsItems.reduce((acc, curr) => acc + (curr.actual_pct || 0), 0);
  const wantsActual = wantsItems.reduce((acc, curr) => acc + (curr.actual_pct || 0), 0);
  const savingsActual = data?.savings_pct ?? 0;

  const needsStatus = needsActual <= 50 ? "safe" : needsActual <= 60 ? "warning" : "danger";
  const wantsStatus = wantsActual <= 30 ? "safe" : wantsActual <= 40 ? "warning" : "danger";
  const savingsStatus = savingsActual >= 20 ? "excellent" : savingsActual >= 10 ? "warning" : "danger";

  // Highest expense in Needs group for rule-based recommendation note
  const highestNeedsCat = [...needsItems].sort((a, b) => (b.actual_pct || 0) - (a.actual_pct || 0))[0];

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header Card */}
      <div className="bg-white rounded-xl border border-[#dcd9d5] p-5 shadow-sm">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="font-semibold text-[#28251d] text-lg">Tabel Alokasi 50/30/20</h2>
            <p className="text-xs text-[#7a7974] mt-1 max-w-2xl">
              Rekomendasi ini diadaptasi dari framework 50/30/20 (Warren &amp; Tyagi, 2005).
            </p>
          </div>
          <button onClick={fetchHealth} className="p-2 rounded-lg hover:bg-[#f3f0ec] text-[#7a7974] flex-shrink-0">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {data?.cold_start && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            Anda masih pengguna baru — sistem menggunakan estimasi awal (Global Model) karena riwayat transaksi
            Anda kurang dari 14 hari. Input transaksi lebih banyak agar hasil analisis semakin personal dan akurat.
          </p>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-[#dcd9d5] h-96 skeleton" />
      ) : (
        <>
          {/* TABEL 1: Ringkasan Framework 50/30/20 */}
          <div className="bg-white rounded-xl border border-[#dcd9d5] p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-[#28251d] text-base">
                Ringkasan Framework 50/30/20
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5e3df] bg-[#f9f8f5]">
                    <th className="text-left px-4 py-3 font-semibold text-[#28251d]">Kelompok</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#28251d]">Aktual</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#28251d]">Ideal</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#28251d]">Waspada</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#28251d]">Kritis</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#28251d]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f0ec]">
                  <tr>
                    <td className="px-4 py-3 font-medium text-[#28251d]">Needs</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-[#28251d]">{needsActual.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-[#555]">&le;50%</td>
                    <td className="px-4 py-3 text-[#555]">50–60%</td>
                    <td className="px-4 py-3 text-[#555]">&gt;60%</td>
                    <td className="px-4 py-3"><StatusDot status={needsStatus} /></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-[#28251d]">Wants</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-[#28251d]">{wantsActual.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-[#555]">&le;30%</td>
                    <td className="px-4 py-3 text-[#555]">30–40%</td>
                    <td className="px-4 py-3 text-[#555]">&gt;40%</td>
                    <td className="px-4 py-3"><StatusDot status={wantsStatus} /></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-[#28251d]">Savings</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-[#28251d]">{savingsActual.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-[#555]">&ge;20%</td>
                    <td className="px-4 py-3 text-[#555]">10–20%</td>
                    <td className="px-4 py-3 text-[#555]">&lt;10%</td>
                    <td className="px-4 py-3"><StatusDot status={savingsStatus} /></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-xs text-[#7a7974] pt-2">
              Framework 50/30/20 mengevaluasi proporsi total pengeluaran berdasarkan tiga kelompok utama, yaitu Needs, Wants, dan Savings.
            </p>
          </div>

          {/* TABEL 2: Detail Alokasi Kategori (Rule-Based) */}
          <div className="bg-white rounded-xl border border-[#dcd9d5] p-5 shadow-sm space-y-6">
            <div>
              <h3 className="font-bold text-[#28251d] text-base">
                Detail Alokasi Kategori
              </h3>
            </div>

            {/* Group 1: NEEDS */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-[#01696f] flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 inline-block rounded-sm"></span> NEEDS
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e5e3df] bg-[#f9f8f5]">
                      <th className="text-left px-4 py-2.5 font-semibold text-[#28251d]">Kategori</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[#28251d]">Aktual</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[#28251d]">Ideal</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[#28251d]">Waspada</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[#28251d]">Kritis</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[#28251d]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3f0ec]">
                    {needsItems.map((item) => {
                      const rules = CATEGORY_DISPLAY_RULES[item.category] || { ideal: `≤${item.ideal_pct}%`, warning: `${item.ideal_pct}-${item.warning_pct}%`, critical: `>${item.critical_pct}%` };
                      return (
                        <tr key={item.category} className="hover:bg-[#f9f8f5]">
                          <td className="px-4 py-3 font-medium text-[#28251d]">{item.category}</td>
                          <td className="px-4 py-3 font-semibold tabular-nums text-[#28251d]">{item.actual_pct}%</td>
                          <td className="px-4 py-3 text-[#555]">{rules.ideal}</td>
                          <td className="px-4 py-3 text-[#555]">{rules.warning}</td>
                          <td className="px-4 py-3 text-[#555]">{rules.critical}</td>
                          <td className="px-4 py-3"><StatusDot status={item.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Group 2: WANTS */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-sm text-[#da7101] flex items-center gap-2">
                <span className="w-3 h-3 bg-orange-500 inline-block rounded-sm"></span> WANTS
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e5e3df] bg-[#f9f8f5]">
                      <th className="text-left px-4 py-2.5 font-semibold text-[#28251d]">Kategori</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[#28251d]">Aktual</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[#28251d]">Ideal</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[#28251d]">Waspada</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[#28251d]">Kritis</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[#28251d]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3f0ec]">
                    {wantsItems.map((item) => {
                      const rules = CATEGORY_DISPLAY_RULES[item.category] || { ideal: `≤${item.ideal_pct}%`, warning: `${item.ideal_pct}-${item.warning_pct}%`, critical: `>${item.critical_pct}%` };
                      return (
                        <tr key={item.category} className="hover:bg-[#f9f8f5]">
                          <td className="px-4 py-3 font-medium text-[#28251d]">{item.category}</td>
                          <td className="px-4 py-3 font-semibold tabular-nums text-[#28251d]">{item.actual_pct}%</td>
                          <td className="px-4 py-3 text-[#555]">{rules.ideal}</td>
                          <td className="px-4 py-3 text-[#555]">{rules.warning}</td>
                          <td className="px-4 py-3 text-[#555]">{rules.critical}</td>
                          <td className="px-4 py-3"><StatusDot status={item.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Group 3: SAVINGS */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-sm text-[#059669] flex items-center gap-2">
                <span className="w-3 h-3 bg-emerald-500 inline-block rounded-sm"></span> SAVINGS
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e5e3df] bg-[#f9f8f5]">
                      <th className="text-left px-4 py-2.5 font-semibold text-[#28251d]">Kategori</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[#28251d]">Aktual</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[#28251d]">Ideal</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[#28251d]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-[#f9f8f5]">
                      <td className="px-4 py-3 font-medium text-[#28251d]">Tabungan / Investasi</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-[#28251d]">{savingsActual}%</td>
                      <td className="px-4 py-3 text-[#555]">&ge;20%</td>
                      <td className="px-4 py-3"><StatusDot status={savingsStatus} /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 3: Rule-Based Recommendation */}
          <div className="bg-white rounded-xl border border-[#dcd9d5] p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-[#28251d] text-base">
              Rekomendasi Alokasi Anggaran
            </h3>

            <div className="space-y-3 text-sm text-[#28251d]">
              <p className="font-semibold text-base">
                Kesehatan Finansial : <span className="text-[#01696f]">{data?.score ?? 0} ({data?.label ?? "Sehat"})</span>
              </p>

              <div className="space-y-2 pt-1">
                <p className="flex items-center gap-2">
                  {needsActual <= 50 ? (
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-red-500 flex-shrink-0" />
                  )}
                  <span>
                    Total Needs {needsActual <= 50 ? "masih berada di bawah batas ideal 50%" : `mencapai ${needsActual.toFixed(1)}%, melebihi batas ideal 50%`}.
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  {wantsActual <= 30 ? (
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-red-500 flex-shrink-0" />
                  )}
                  <span>
                    Total Wants {wantsActual <= 30 ? "masih berada di bawah batas ideal 30%" : `mencapai ${wantsActual.toFixed(1)}%, melebihi batas ideal 30%`}.
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  {savingsActual >= 20 ? (
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
                  )}
                  <span>
                    Tabungan {savingsActual >= 20 ? `telah mencapai ${savingsActual}%, melebihi target minimum 20%` : `baru mencapai ${savingsActual}%, kurang dari target minimum 20%`}.
                  </span>
                </p>

                {highestNeedsCat && (
                  <div className="flex items-start gap-2.5 text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200 mt-2">
                    <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>
                      Kategori {highestNeedsCat.category} merupakan pengeluaran terbesar dalam kelompok Needs ({highestNeedsCat.actual_pct}%) sehingga perlu dipantau agar tidak meningkat pada bulan berikutnya.
                    </span>
                  </div>
                )}

                {breakdown.filter((b) => b.status !== "safe").length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-[#f3f0ec]">
                    <p className="font-semibold text-xs text-[#7a7974] uppercase tracking-wider">
                      Tindakan Rekomendasi per Kategori:
                    </p>
                    {breakdown.filter((b) => b.status !== "safe").map((b) => (
                      <div
                        key={b.category}
                        className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs leading-relaxed ${
                          b.status === "danger"
                            ? "bg-red-50 border-red-200 text-red-800"
                            : "bg-amber-50 border-amber-200 text-amber-800"
                        }`}
                      >
                        <AlertTriangle
                          size={15}
                          className={`flex-shrink-0 mt-0.5 ${
                            b.status === "danger" ? "text-red-600" : "text-amber-600"
                          }`}
                        />
                        <span>{b.recommendation}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
