import React, { useEffect, useState } from "react";
import { TrendingUp, RefreshCw, Cpu, Calendar, Clock, BarChart3, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { formatRupiah } from "../utils/format";

export default function PredictionPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get("/predict");
      setData(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPredictions(); }, []);

  const chartData = data?.predictions?.filter((p) => p.predicted_amount > 0).map((p) => ({
    name: p.category.split(" ")[0],
    Prediksi: p.predicted_amount,
  })) || [];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#01696f] to-[#006494] rounded-xl p-5 md:p-6 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={18} />
              <span className="text-xs md:text-sm font-medium opacity-90">Layanan Proyeksi Pengeluaran</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold">Prediksi Pengeluaran Bulanan</h2>
            <p className="text-sm opacity-85 mt-1">
              Estimasi total pengeluaran bulan <strong className="underline">{data?.prediction_month || "..."}</strong> sebesar{" "}
              <strong className="text-yellow-300 font-semibold">{formatRupiah(data?.total_predicted || 0)}</strong>.
            </p>
            {data?.cold_start && (
              <p className="text-xs opacity-75 mt-2 bg-white/10 px-3 py-1 rounded-md inline-block">
                Estimasi awal berdasarkan data transaksi {data?.days_history} hari.
              </p>
            )}
          </div>
          <button onClick={fetchPredictions} disabled={loading} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors self-start md:self-auto">
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Model Parameter Metadata Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-[#dcd9d5] p-3.5 shadow-sm">
          <div className="flex items-center gap-2 text-[#7a7974] text-xs mb-1">
            <Cpu size={14} className="text-[#01696f]" />
            <span>Metode Analisis</span>
          </div>
          <p className="font-bold text-[#28251d] text-base">Time-Series (LSTM)</p>
        </div>
        <div className="bg-white rounded-xl border border-[#dcd9d5] p-3.5 shadow-sm">
          <div className="flex items-center gap-2 text-[#7a7974] text-xs mb-1">
            <Clock size={14} className="text-[#01696f]" />
            <span>Periode Jendela</span>
          </div>
          <p className="font-bold text-[#28251d] text-base">7 Hari</p>
        </div>
        <div className="bg-white rounded-xl border border-[#dcd9d5] p-3.5 shadow-sm">
          <div className="flex items-center gap-2 text-[#7a7974] text-xs mb-1">
            <Calendar size={14} className="text-[#01696f]" />
            <span>Data Masukan</span>
          </div>
          <p className="font-bold text-[#28251d] text-base">Riwayat Transaksi</p>
        </div>
        <div className="bg-white rounded-xl border border-[#dcd9d5] p-3.5 shadow-sm">
          <div className="flex items-center gap-2 text-[#7a7974] text-xs mb-1">
            <BarChart3 size={14} className="text-[#01696f]" />
            <span>Cakupan Proyeksi</span>
          </div>
          <p className="font-bold text-[#28251d] text-base">30 Hari ke Depan</p>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-xl p-5 h-28 skeleton border border-[#dcd9d5]" />)}</div>
      ) : (
        <>
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-[#dcd9d5] p-4 md:p-5 shadow-sm">
              <h3 className="font-semibold text-[#28251d] text-sm mb-4">Grafik Prediksi Pengeluaran per Kategori ({data?.prediction_month})</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f0ec" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#7a7974" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11, fill: "#7a7974" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => formatRupiah(v)} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="Prediksi" fill="#01696f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data?.predictions?.filter((p) => p.predicted_amount > 0).map((p) => (
              <div key={p.category} className="bg-white rounded-xl border border-[#dcd9d5] p-4 shadow-sm">
                <h4 className="font-medium text-[#28251d] text-sm">{p.category}</h4>
                <p className="text-lg md:text-xl font-bold text-[#01696f] mt-1 tabular-nums">{formatRupiah(p.predicted_amount)}</p>
                <p className="text-xs text-[#7a7974] mt-1">Estimasi bulan {data?.prediction_month?.split(" ")[0]}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#f9f8f5] border border-[#dcd9d5] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs md:text-sm text-[#7a7974]">
              Lihat analisis lengkap alokasi 50/30/20 dan rekomendasi pengelolaan keuangan berdasarkan hasil prediksi ini di halaman <strong className="text-[#28251d]">Alokasi 50/30/20</strong>.
            </p>
            <button
              onClick={() => navigate("/allocation")}
              className="flex items-center gap-2 px-4 py-2 bg-[#01696f] text-white rounded-lg text-xs font-medium hover:bg-[#0c4e54] transition-colors whitespace-nowrap"
            >
              Ke Rekomendasi Alokasi <ArrowRight size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

