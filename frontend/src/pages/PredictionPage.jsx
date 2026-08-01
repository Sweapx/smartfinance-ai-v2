import React, { useEffect, useState } from "react";
import { TrendingUp, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import api from "../utils/api";
import { formatRupiah } from "../utils/format";

export default function PredictionPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <div className="bg-gradient-to-r from-[#01696f] to-[#006494] rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><TrendingUp size={18} /><span className="text-sm font-medium opacity-90">LSTM Deep Learning Forecasting Service</span></div>
            <h2 className="text-xl font-semibold">Prediksi {data?.prediction_month || "..."}</h2>
            <p className="text-sm opacity-75 mt-0.5">Total diprediksi: {formatRupiah(data?.total_predicted || 0)}</p>
            {data?.cold_start && <p className="text-xs opacity-70 mt-1">* Menggunakan Global Model (Cold Start) — data historis: {data?.days_history} hari</p>}
          </div>
          <button onClick={fetchPredictions} disabled={loading} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-xl p-5 h-28 skeleton border border-[#dcd9d5]" />)}</div>
      ) : (
        <>
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-[#dcd9d5] p-5 shadow-sm">
              <h3 className="font-semibold text-[#28251d] text-sm mb-4">Prediksi Pengeluaran per Kategori</h3>
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

          <div className="grid md:grid-cols-2 gap-4">
            {data?.predictions?.filter((p) => p.predicted_amount > 0).map((p) => (
              <div key={p.category} className="bg-white rounded-xl border border-[#dcd9d5] p-4 shadow-sm">
                <h4 className="font-medium text-[#28251d] text-sm">{p.category}</h4>
                <p className="text-xl font-semibold text-[#28251d] mt-0.5 tabular-nums">{formatRupiah(p.predicted_amount)}</p>
                <p className="text-xs text-[#7a7974] mt-1">Estimasi bulan depan</p>
              </div>
            ))}
          </div>

          <div className="bg-[#f9f8f5] border border-[#dcd9d5] rounded-xl p-4">
            <p className="text-xs text-[#7a7974]">
              Lihat analisis lengkap alokasi 50/30/20 dan rekomendasi keuangan di halaman <strong className="text-[#28251d]">Alokasi 50/30/20</strong>,
              atau tanyakan langsung ke <strong className="text-[#28251d]">Chatbot Advisor</strong>.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
