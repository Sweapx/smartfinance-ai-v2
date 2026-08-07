import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, Wallet, TrendingUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", monthly_budget: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await register(form.name, form.email, form.password, 0, Number(form.monthly_budget) || 0);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Registrasi gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 bg-[#01696f] rounded-xl flex items-center justify-center">
            <TrendingUp size={20} color="white" />
          </div>
          <span className="font-semibold text-lg text-[#28251d]">SmartFinance AI</span>
        </div>

        <div className="bg-white rounded-2xl border border-[#dcd9d5] p-7 shadow-sm">
          <h1 className="text-lg font-semibold text-[#28251d] mb-1">Buat akun baru</h1>
          <p className="text-sm text-[#7a7974] mb-6">Mulai kelola keuangan Anda secara proaktif</p>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#28251d] mb-1.5">Nama Lengkap</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a7974]" />
                <input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Nama Anda"
                  className="w-full pl-10 pr-3.5 py-2.5 border border-[#d4d1ca] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#28251d] mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a7974]" />
                <input type="email" required value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-3.5 py-2.5 border border-[#d4d1ca] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#28251d] mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a7974]" />
                <input type="password" required minLength={6} value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Minimal 6 karakter"
                  className="w-full pl-10 pr-3.5 py-2.5 border border-[#d4d1ca] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#28251d] mb-1.5">
                Budget Bulanan (Rp) <span className="text-[#7a7974] font-normal">(opsional)</span>
              </label>
              <div className="relative">
                <Wallet size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a7974]" />
                <input type="number" min="0" value={form.monthly_budget}
                  onChange={(e) => setForm((p) => ({ ...p, monthly_budget: e.target.value }))}
                  placeholder="Contoh: 6000000"
                  className="w-full pl-10 pr-3.5 py-2.5 border border-[#d4d1ca] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f]" />
              </div>
              <p className="text-xs text-[#7a7974] mt-1.5">Batas maksimal pengeluaran bulanan Anda (dapat diatur nanti di menu Anggaran). Pemasukan otomatis dihitung dari transaksi income.</p>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-[#01696f] hover:bg-[#0c4e54] text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">
              {loading ? "Memproses..." : "Daftar"}
            </button>
          </form>

          <p className="text-sm text-[#7a7974] text-center mt-5">
            Sudah punya akun?{" "}
            <Link to="/login" className="text-[#01696f] font-medium hover:underline">Masuk</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
