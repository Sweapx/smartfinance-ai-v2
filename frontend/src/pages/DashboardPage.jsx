import React, { useEffect, useState, useRef } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  BarChart3, 
  RefreshCw, 
  Heart, 
  ArrowRight, 
  Bot, 
  User, 
  Send, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle,
  TrendingUpIcon
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { formatRupiah, CATEGORY_COLORS, STATUS_COLOR, STATUS_LABEL } from "../utils/format";

const StatCard = ({ title, value, icon: Icon, color, sub }) => (
  <div className="bg-white rounded-xl p-4 md:p-5 border border-[#dcd9d5] shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs md:text-sm text-[#7a7974]">{title}</p>
      <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={17} />
      </div>
    </div>
    <div className="text-lg md:text-xl font-bold text-[#28251d]">{value}</div>
    {sub && <p className="text-xs text-[#7a7974] mt-1">{sub}</p>}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#dcd9d5] rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-[#28251d] mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatRupiah(p.value)}
        </p>
      ))}
    </div>
  );
};

function HealthScoreGauge({ score, label }) {
  const color = score >= 80 ? "#16a34a" : score >= 60 ? "#d97706" : score >= 40 ? "#ea580c" : "#dc2626";
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-20 h-20 md:w-24 md:h-24 -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f0ec" strokeWidth="10" />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg md:text-xl font-bold text-[#28251d]">{score}</span>
        </div>
      </div>
      <div>
        <p className="text-xs text-[#7a7974]">Financial Health Score</p>
        <p className="font-bold text-[#28251d] text-base" style={{ color }}>{label}</p>
        <p className="text-xs text-[#7a7974] mt-1">Berdasarkan framework 50/30/20</p>
      </div>
    </div>
  );
}

const STARTER_PROMPTS = [
  "Bagaimana kesehatan finansial saya?",
  "Kategori pengeluaran mana yang boros?",
  "Berikan tips penghematan bulan ini",
];

function DashboardChatbot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Halo ${user?.name?.split(" ")[0] || ""}! Saya SmartFinance Advisor. Ada yang ingin Anda tanyakan tentang kondisi keuangan Anda?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const { data } = await api.post("/chat", { message: msg, session_id: sessionId });
      setSessionId(data.session_id);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Maaf, terjadi kendala saat menghubungkan ke AI Advisor.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#dcd9d5] shadow-sm flex flex-col h-[380px]">
      <div className="p-4 border-b border-[#f3f0ec] flex items-center justify-between bg-[#f9f8f5] rounded-t-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#01696f] rounded-lg flex items-center justify-center">
            <Bot size={18} color="white" />
          </div>
          <div>
            <h3 className="font-semibold text-[#28251d] text-sm">Chatbot Advisor</h3>
            <p className="text-[11px] text-[#7a7974]">Asisten Keuangan Berbasis LLM</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> AI Active
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#ffffff] text-xs">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                m.role === "assistant" ? "bg-[#01696f] text-white" : "bg-[#dcd9d5] text-[#28251d]"
              }`}
            >
              {m.role === "assistant" ? <Bot size={13} /> : <User size={13} />}
            </div>
            <div
              className={`max-w-[80%] px-3 py-2 rounded-xl leading-relaxed ${
                m.role === "assistant"
                  ? "bg-[#f3f0ec] text-[#28251d] rounded-tl-none"
                  : "bg-[#01696f] text-white rounded-tr-none"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 items-center text-xs text-[#7a7974]">
            <Bot size={14} className="animate-spin text-[#01696f]" /> AI sedang mengetik...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {messages.length <= 2 && (
        <div className="px-3 py-2 bg-[#f9f8f5] border-t border-[#f3f0ec] flex gap-1.5 overflow-x-auto no-scrollbar">
          {STARTER_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="text-[11px] px-2.5 py-1 bg-white border border-[#dcd9d5] rounded-full text-[#7a7974] hover:text-[#01696f] hover:border-[#01696f] whitespace-nowrap transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="p-2.5 border-t border-[#f3f0ec] bg-white rounded-b-xl">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Tanyakan rekomendasi keuangan Anda..."
            disabled={loading}
            className="flex-1 px-3 py-2 bg-[#f9f8f5] border border-[#dcd9d5] rounded-lg text-xs focus:outline-none focus:border-[#01696f]"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="px-3 py-2 bg-[#01696f] hover:bg-[#0c4e54] text-white rounded-lg disabled:opacity-40 transition-colors flex items-center justify-center"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [predictionData, setPredictionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [{ data: d }, { data: p }] = await Promise.all([
        api.get("/predict/dashboard"),
        api.get("/predict"),
      ]);
      setData(d);
      setPredictionData(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading)
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-[#dcd9d5] h-28 skeleton" />
          ))}
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#dcd9d5] h-72 skeleton" />
      </div>
    );

  const { current_month, monthly_trend, category_breakdown, financial_health, savings_pct } = data || {};
  const totalExpenseThisMonth = current_month?.expense || 1;

  // Enhance category breakdown with percentage calculation
  const enhancedCategories = (category_breakdown || []).map((cat) => ({
    ...cat,
    percentage: ((cat.total / (totalExpenseThisMonth || 1)) * 100).toFixed(1),
  }));

  return (
    <div className="space-y-5 animate-fade-in pb-8">
      {/* 3 Summary KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Pemasukan"
          icon={TrendingUp}
          value={formatRupiah(current_month?.income || 0)}
          color="bg-green-50 text-green-600"
          sub="Bulan ini"
        />
        <StatCard
          title="Total Pengeluaran"
          icon={TrendingDown}
          value={formatRupiah(current_month?.expense || 0)}
          color="bg-red-50 text-red-600"
          sub="Bulan ini"
        />
        <StatCard
          title="Saldo Bersih"
          icon={Wallet}
          value={formatRupiah(current_month?.balance || 0)}
          color="bg-[#01696f]/10 text-[#01696f]"
          sub={current_month?.balance >= 0 ? "Surplus" : "Defisit"}
        />
      </div>

      {/* AI Prediksi & Rekomendasi Interactive Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Interactive Prediction Card -> Click navigates to /prediction */}
        <div
          onClick={() => navigate("/prediction")}
          className="bg-gradient-to-br from-[#01696f] to-[#0c4e54] text-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider bg-white/15 px-2.5 py-0.5 rounded-full text-white">
                AI Forecasting Insight
              </span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform opacity-80" />
            </div>
            <h3 className="font-bold text-lg md:text-xl mt-1">
              Prediksi Pengeluaran {predictionData?.prediction_month || "Bulan Depan"}
            </h3>
            <p className="text-2xl font-black text-yellow-300 mt-2">
              {formatRupiah(predictionData?.total_predicted || 0)}
            </p>
            <p className="text-xs opacity-85 mt-1">
              Model LSTM memprediksi estimasi total pengeluaran sebulan ke depan berdasarkan 7 hari histori sekuensial.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs font-medium">
            <span>Lihat Detail Prediksi per Kategori</span>
            <span className="underline group-hover:text-yellow-200">Buka Halaman Prediksi &rarr;</span>
          </div>
        </div>

        {/* Interactive Recommendation & Health Score Card -> Click navigates to /allocation */}
        <div
          onClick={() => navigate("/allocation")}
          className="bg-white border border-[#dcd9d5] rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider bg-[#01696f]/10 text-[#01696f] px-2.5 py-0.5 rounded-full">
                50/30/20 Rule Recommendation
              </span>
              <ArrowRight size={18} className="text-[#01696f] group-hover:translate-x-1 transition-transform" />
            </div>
            <HealthScoreGauge
              score={financial_health?.score || 0}
              label={financial_health?.label || "-"}
            />
            <p className="text-xs text-[#7a7974] mt-3">
              Alokasi Tabungan Saat Ini: <strong className="text-[#28251d]">{savings_pct ?? 0}%</strong> (Target ideal minimal 20%).
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#f3f0ec] flex items-center justify-between text-xs font-medium text-[#01696f]">
            <span>Lihat Breakdown & Rekomendasi Otomatis</span>
            <span className="underline group-hover:text-[#0c4e54]">Buka Detail Rekomendasi &rarr;</span>
          </div>
        </div>
      </div>

      {/* Main Charts & Interactive Chatbot Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Trend Pengeluaran 6 Bulan */}
        <div className="lg:col-span-2 bg-white rounded-xl p-4 md:p-5 border border-[#dcd9d5] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-[#28251d] text-sm">Tren Pengeluaran 6 Bulan</h3>
              <p className="text-xs text-[#7a7974] mt-0.5">Historis pergerakan pengeluaran Anda</p>
            </div>
            <button
              onClick={fetchDashboard}
              className="p-2 rounded-lg hover:bg-[#f3f0ec] text-[#7a7974]"
            >
              <RefreshCw size={15} />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthly_trend || []}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#01696f" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#01696f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f0ec" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#7a7974" }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                tick={{ fontSize: 11, fill: "#7a7974" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="actual"
                name="Pengeluaran"
                stroke="#01696f"
                strokeWidth={2.5}
                fill="url(#colorActual)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Embedded Chatbot Advisor Card */}
        <DashboardChatbot />
      </div>

      {/* Detailed Category Distribution Card (Donut Chart + Rp & % Detail List) */}
      <div className="bg-white rounded-xl p-4 md:p-5 border border-[#dcd9d5] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-semibold text-[#28251d] text-sm">Distribusi Kategori Pengeluaran Bulan Ini</h3>
            <p className="text-xs text-[#7a7974] mt-0.5">Rincian pengeluaran dalam persen (%) dan nominal Rupiah (Rp)</p>
          </div>
        </div>

        {enhancedCategories.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Donut Chart */}
            <div className="lg:col-span-5 h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={enhancedCategories}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {enhancedCategories.map((entry, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[entry.category] || "#7a7974"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatRupiah(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Detail Information Table / List in Rp & % */}
            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {enhancedCategories.map((cat) => {
                  const color = CATEGORY_COLORS[cat.category] || "#7a7974";
                  return (
                    <div
                      key={cat.category}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-[#f3f0ec] bg-[#f9f8f5]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs font-medium text-[#28251d] truncate">{cat.category}</span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-xs font-bold text-[#28251d] tabular-nums">{formatRupiah(cat.total)}</p>
                        <p className="text-[11px] text-[#7a7974] font-medium">{cat.percentage}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-44 flex flex-col items-center justify-center text-[#7a7974]">
            <BarChart3 size={32} className="mb-2 opacity-30" />
            <p className="text-sm">Belum ada data pengeluaran bulan ini</p>
          </div>
        )}
      </div>
    </div>
  );
}
