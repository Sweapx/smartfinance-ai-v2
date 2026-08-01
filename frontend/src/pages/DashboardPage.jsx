import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Wallet, BarChart3, RefreshCw, Heart } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import api from "../utils/api";
import { formatRupiah, CATEGORY_COLORS, STATUS_COLOR, STATUS_LABEL } from "../utils/format";

const StatCard = ({ title, value, icon: Icon, color, sub }) => (
  <div className="bg-white rounded-xl p-5 border border-[#dcd9d5] shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm text-[#7a7974]">{title}</p>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}><Icon size={17} /></div>
    </div>
    <div className="text-xl font-semibold text-[#28251d]">{value}</div>
    {sub && <p className="text-xs text-[#7a7974] mt-1">{sub}</p>}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#dcd9d5] rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-[#28251d] mb-1">{label}</p>
      {payload.map((p) => (<p key={p.name} style={{ color: p.color }}>{p.name}: {formatRupiah(p.value)}</p>))}
    </div>
  );
};

function HealthScoreGauge({ score, label }) {
  const color = score >= 80 ? "#437a22" : score >= 60 ? "#d19900" : score >= 40 ? "#da7101" : "#a13544";
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f0ec" strokeWidth="10" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-semibold text-[#28251d]">{score}</span>
        </div>
      </div>
      <div>
        <p className="text-xs text-[#7a7974]">Financial Health Score</p>
        <p className="font-semibold text-[#28251d]" style={{ color }}>{label}</p>
        <p className="text-xs text-[#7a7974] mt-1">Berdasarkan alokasi 50/30/20</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get("/predict/dashboard");
      setData(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDashboard(); }, []);

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-xl p-5 border border-[#dcd9d5] h-28 skeleton" />)}
      </div>
      <div className="bg-white rounded-xl p-5 border border-[#dcd9d5] h-72 skeleton" />
    </div>
  );

  const { current_month, monthly_trend, category_breakdown, financial_health, main_allocation, savings_pct } = data || {};

  const mainAllocData = main_allocation ? Object.entries(main_allocation).map(([name, v]) => ({ name, value: v.pct })) : [];
  const MAIN_COLORS = ["#01696f", "#da7101", "#437a22"];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Pemasukan" icon={TrendingUp} value={formatRupiah(current_month?.income || 0)} color="bg-green-50 text-green-600" sub="Bulan ini" />
        <StatCard title="Total Pengeluaran" icon={TrendingDown} value={formatRupiah(current_month?.expense || 0)} color="bg-red-50 text-red-600" sub="Bulan ini" />
        <StatCard title="Saldo Bersih" icon={Wallet} value={formatRupiah(current_month?.balance || 0)} color="bg-[#01696f]/10 text-[#01696f]" sub={current_month?.balance >= 0 ? "Surplus" : "Defisit"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-[#dcd9d5] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-[#28251d] text-sm">Tren Pengeluaran 6 Bulan</h3>
              <p className="text-xs text-[#7a7974] mt-0.5">Historis pengeluaran bulanan Anda</p>
            </div>
            <button onClick={fetchDashboard} className="p-2 rounded-lg hover:bg-[#f3f0ec] text-[#7a7974]"><RefreshCw size={15} /></button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthly_trend || []}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#01696f" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#01696f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f0ec" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#7a7974" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11, fill: "#7a7974" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="actual" name="Pengeluaran" stroke="#01696f" strokeWidth={2} fill="url(#colorActual)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#dcd9d5] shadow-sm flex flex-col">
          <h3 className="font-semibold text-[#28251d] text-sm mb-4 flex items-center gap-1.5"><Heart size={14} className="text-[#01696f]" /> Kesehatan Finansial</h3>
          <HealthScoreGauge score={financial_health?.score || 0} label={financial_health?.label || "-"} />
          <div className="mt-4 pt-4 border-t border-[#f3f0ec]">
            <div className="flex justify-between text-xs text-[#7a7974] mb-1">
              <span>Alokasi Tabungan</span><span className="font-medium text-[#28251d]">{savings_pct ?? 0}%</span>
            </div>
            <div className="w-full bg-[#f3f0ec] rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-[#01696f]" style={{ width: `${Math.min(100, Math.max(0, savings_pct || 0))}%` }} />
            </div>
            <p className="text-xs text-[#7a7974] mt-1.5">Target ideal: minimal 20% dari pemasukan</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl p-5 border border-[#dcd9d5] shadow-sm">
          <h3 className="font-semibold text-[#28251d] text-sm mb-4">Distribusi Kategori Pengeluaran</h3>
          {category_breakdown?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={category_breakdown} dataKey="total" nameKey="category" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {category_breakdown.map((entry, i) => (<Cell key={i} fill={CATEGORY_COLORS[entry.category] || "#7a7974"} />))}
                </Pie>
                <Tooltip formatter={(v) => formatRupiah(v)} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-[#7a7974]">
              <BarChart3 size={32} className="mb-2 opacity-30" /><p className="text-sm">Belum ada data transaksi</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#dcd9d5] shadow-sm">
          <h3 className="font-semibold text-[#28251d] text-sm mb-1">Pembagian Alokasi Dana</h3>
          <p className="text-xs text-[#7a7974] mb-4">Framework 50/30/20 (Warren & Tyagi, 2005)</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={mainAllocData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ value }) => `${value}%`}>
                {mainAllocData.map((_, i) => (<Cell key={i} fill={MAIN_COLORS[i]} />))}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
