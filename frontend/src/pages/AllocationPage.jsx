import React, { useEffect, useState } from "react";
import { RefreshCw, Info, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";
import api from "../utils/api";
import { formatRupiah, STATUS_COLOR, STATUS_LABEL } from "../utils/format";

const StatusIcon = ({ status }) => {
  if (status === "danger") return <AlertTriangle size={14} />;
  if (status === "warning") return <AlertCircle size={14} />;
  if (status === "caution") return <AlertCircle size={14} />;
  return <CheckCircle size={14} />;
};

export default function AllocationPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get("/predict/health-score");
      setData(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHealth(); }, []);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="bg-white rounded-xl border border-[#dcd9d5] p-5 shadow-sm">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="font-semibold text-[#28251d] text-base">Tabel Alokasi 50/30/20</h2>
            <p className="text-xs text-[#7a7974] mt-1 max-w-2xl">
              Rekomendasi ini diadaptasi dari framework 50/30/20 (Warren & Tyagi, 2005) dan disesuaikan dengan konteks
              literasi keuangan pribadi sebagaimana diatur dalam POJK No. 76/POJK.07/2016 tentang Peningkatan Literasi
              dan Inklusi Keuangan di Sektor Jasa Keuangan.
            </p>
          </div>
          <button onClick={fetchHealth} className="p-2 rounded-lg hover:bg-[#f3f0ec] text-[#7a7974] flex-shrink-0"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /></button>
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
          <div className="bg-white rounded-xl border border-[#dcd9d5] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#f3f0ec] bg-[#f9f8f5]">
                    {["Kategori", "Tipe", "Aktual", "Ideal", "Waspada", "Kritis", "Status"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#7a7974] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f0ec]">
                  {data?.breakdown?.map((row) => {
                    const c = STATUS_COLOR[row.status];
                    const tipeStyle = row.tipe === "Needs" 
                      ? "bg-green-100 text-green-800 border-green-200 font-semibold" 
                      : row.tipe === "Wants" 
                      ? "bg-orange-100 text-orange-800 border-orange-200 font-semibold" 
                      : "bg-blue-100 text-blue-800 border-blue-200 font-semibold";
                    return (
                      <tr key={row.category} className="hover:bg-[#f9f8f5]">
                        <td className="px-4 py-3 text-sm font-medium text-[#28251d]">{row.category}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full border ${tipeStyle}`}>{row.tipe}</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold tabular-nums text-[#28251d]">{row.actual_pct}%</td>
                        <td className="px-4 py-3 text-sm text-[#7a7974]">&le;{row.ideal_pct}%</td>
                        <td className="px-4 py-3 text-sm text-[#7a7974]">{row.ideal_pct}-{row.warning_pct}%</td>
                        <td className="px-4 py-3 text-sm text-[#7a7974]">&gt;{row.critical_pct}%</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border font-medium ${c.bg} ${c.text} ${c.border}`}>
                            <StatusIcon status={row.status} />{STATUS_LABEL[row.status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-[#f9f8f5]">
                    <td className="px-4 py-3 text-sm font-semibold text-[#28251d]">Tabungan / Investasi</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2.5 py-0.5 rounded-full border bg-blue-100 text-blue-800 border-blue-200 font-semibold">Savings</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold tabular-nums text-[#28251d]">{data?.savings_pct ?? 0}%</td>
                    <td className="px-4 py-3 text-sm text-[#7a7974]">&ge;{data?.savings_ideal_pct ?? 20}%</td>
                    <td colSpan={2} className="px-4 py-3 text-sm text-[#7a7974]">-</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border font-medium ${STATUS_COLOR[data?.savings_status || "safe"].bg} ${STATUS_COLOR[data?.savings_status || "safe"].text} ${STATUS_COLOR[data?.savings_status || "safe"].border}`}>
                        <StatusIcon status={data?.savings_status || "safe"} />{STATUS_LABEL[data?.savings_status || "safe"]}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#dcd9d5] p-5 shadow-sm">
            <h3 className="font-semibold text-[#28251d] text-sm mb-4">Rekomendasi Otomatis (Rule-Based)</h3>
            {data?.top_recommendations?.length > 0 ? (
              <div className="space-y-3">
                {data.top_recommendations.map((rec, i) => {
                  const c = STATUS_COLOR[rec.status];
                  return (
                    <div key={i} className={`p-4 rounded-lg border ${c.border} ${c.bg}`}>
                      <div className="flex items-start gap-2.5">
                        <StatusIcon status={rec.status} />
                        <p className={`text-sm ${c.text}`}>{rec.recommendation}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 text-green-700 bg-green-50 border border-green-200 rounded-lg p-4">
                <CheckCircle size={16} /><p className="text-sm">Semua kategori pengeluaran Anda masih dalam batas ideal. Pertahankan!</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
