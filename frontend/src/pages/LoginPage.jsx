import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, TrendingUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Email atau password salah");
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
          <h1 className="text-lg font-semibold text-[#28251d] mb-1">Masuk ke akun Anda</h1>
          <p className="text-sm text-[#7a7974] mb-6">Kelola keuangan Anda dengan bantuan AI</p>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#28251d] mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a7974]" />
                <input type="email" required value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-3.5 py-2.5 border border-[#d4d1ca] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#28251d] mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a7974]" />
                <input type="password" required value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 border border-[#d4d1ca] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f]" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-[#01696f] hover:bg-[#0c4e54] text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <p className="text-sm text-[#7a7974] text-center mt-5">
            Belum punya akun?{" "}
            <Link to="/register" className="text-[#01696f] font-medium hover:underline">Daftar sekarang</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
