import React, { useState, useEffect } from "react";
import { Wallet, RefreshCw, Save, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import api from "../utils/api";
import { formatRupiah } from "../utils/format";

export default function BudgetPage() {
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formBudget, setFormBudget] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchBudget = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/budget");
      setBudget(data);
      setFormBudget(data.monthly_budget.toString());
    } catch (e) {
      console.error(e);
      setError("Gagal memuat data budget");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBudget(); }, []);

  const handleSave = async () => {
    const newBudget = parseFloat(formBudget);
    if (isNaN(newBudget) || newBudget < 0) {
      setError("Budget harus berupa angka positif");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await api.put("/budget", { monthly_budget: newBudget });
      await fetchBudget();
      setEditing(false);
    } catch (e) {
      setError("Gagal menyimpan budget");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset budget ke 0?")) return;
    try {
      await api.delete("/budget");
      await fetchBudget();
    } catch (e) {
      setError("Gagal reset budget");
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-[#dcd9d5] h-64 skeleton" />
      </div>
    );
  }

  const isOverBudget = budget.budget_percentage > 100;
  const isNearLimit = budget.budget_percentage > 80 && budget.budget_percentage <= 100;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="bg-white rounded-xl border border-[#dcd9d5] p-6 shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-semibold text-[#28251d] text-lg flex items-center gap-2">
              <Wallet size={20} className="text-[#01696f]" /> Pengaturan Anggaran Bulanan
            </h2>
            <p className="text-sm text-[#7a7974] mt-1">Atur batas pengeluaran bulanan Anda untuk kontrol keuangan yang lebih baik</p>
          </div>
          <button onClick={fetchBudget} className="p-2 rounded-lg hover:bg-[#f3f0ec] text-[#7a7974]">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#f9f8f5] rounded-lg p-4">
            <p className="text-xs text-[#7a7974] mb-1">Pemasukan Bulanan</p>
            <p className="text-lg font-semibold text-[#28251d]">{formatRupiah(budget.monthly_income)}</p>
          </div>
          <div className="bg-[#f9f8f5] rounded-lg p-4">
            <p className="text-xs text-[#7a7974] mb-1">Budget Bulanan</p>
            <p className="text-lg font-semibold text-[#01696f]">{formatRupiah(budget.monthly_budget)}</p>
          </div>
          <div className="bg-[#f9f8f5] rounded-lg p-4">
            <p className="text-xs text-[#7a7974] mb-1">Sudah Digunakan</p>
            <p className={`text-lg font-semibold ${isOverBudget ? "text-red-500" : "text-[#28251d]"}`}>
              {formatRupiah(budget.budget_used)}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[#7a7974]">Penggunaan Budget</span>
            <span className={`font-medium ${isOverBudget ? "text-red-500" : "text-[#28251d]"}`}>
              {budget.budget_percentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-[#f3f0ec] rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                isOverBudget ? "bg-red-500" : isNearLimit ? "bg-yellow-500" : "bg-[#01696f]"
              }`}
              style={{ width: `${Math.min(100, budget.budget_percentage)}%` }}
            />
          </div>
          <p className="text-xs text-[#7a7974] mt-2">
            Sisa budget: <span className={`font-medium ${isOverBudget ? "text-red-500" : "text-[#01696f]"}`}>
              {formatRupiah(budget.budget_remaining)}
            </span>
          </p>
        </div>

        {editing ? (
          <div className="bg-[#f9f8f5] rounded-lg p-4">
            <label className="block text-sm font-medium text-[#28251d] mb-2">
              Atur Budget Bulanan Baru (Rp)
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                value={formBudget}
                onChange={(e) => setFormBudget(e.target.value)}
                placeholder="0"
                className="flex-1 px-4 py-2.5 border border-[#d4d1ca] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f]"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#01696f] hover:bg-[#0c4e54] text-white rounded-lg text-sm font-medium disabled:opacity-60"
              >
                <Save size={16} /> {saving ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                onClick={() => { setEditing(false); setFormBudget(budget.monthly_budget.toString()); setError(""); }}
                className="px-4 py-2.5 border border-[#d4d1ca] rounded-lg text-sm text-[#7a7974] hover:bg-[#f3f0ec]"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#01696f] hover:bg-[#0c4e54] text-white rounded-lg text-sm font-medium"
            >
              <Wallet size={16} /> Edit Budget
            </button>
            {budget.monthly_budget > 0 && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
              >
                <Trash2 size={16} /> Reset
              </button>
            )}
          </div>
        )}
      </div>

      <div className={`rounded-xl p-4 flex items-start gap-3 ${
        isOverBudget ? "bg-red-50 border border-red-200" : isNearLimit ? "bg-yellow-50 border border-yellow-200" : "bg-green-50 border border-green-200"
      }`}>
        {isOverBudget ? (
          <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
        ) : isNearLimit ? (
          <AlertTriangle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
        ) : (
          <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
        )}
        <div>
          <p className={`font-medium text-sm ${
            isOverBudget ? "text-red-700" : isNearLimit ? "text-yellow-700" : "text-green-700"
          }`}>
            {isOverBudget
              ? "Budget Terlampaui!"
              : isNearLimit
              ? "Budget Hampir Habis"
              : "Budget Aman"}
          </p>
          <p className={`text-xs mt-1 ${
            isOverBudget ? "text-red-600" : isNearLimit ? "text-yellow-600" : "text-green-600"
          }`}>
            {isOverBudget
              ? `Anda telah melebihi budget sebesar ${formatRupiah(Math.abs(budget.budget_remaining))}. Pertimbangkan untuk mengurangi pengeluaran bulan ini.`
              : isNearLimit
              ? `Sisa budget Anda ${formatRupiah(budget.budget_remaining)}. Pertimbangkan untuk berhati-hati dengan pengeluaran.`
              : `Pengeluaran Anda masih dalam batas budget. Pertahankan pengelolaan keuangan yang baik!`}
          </p>
        </div>
      </div>
    </div>
  );
}
