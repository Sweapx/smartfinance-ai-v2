import React, { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle,
  X,
  Save,
  Layers,
  Utensils,
  Car,
  FileText,
  HeartPulse,
  ShoppingBag,
  Film,
  GraduationCap,
  MoreHorizontal,
} from "lucide-react";
import api from "../utils/api";
import { formatRupiah, CATEGORIES } from "../utils/format";

const CATEGORY_ICONS = {
  "Food & Beverage": Utensils,
  Transport: Car,
  Bills: FileText,
  Health: HeartPulse,
  Shopping: ShoppingBag,
  Entertainment: Film,
  Education: GraduationCap,
  Other: MoreHorizontal,
};

const CATEGORY_GROUPS = {
  Bills: "Needs",
  "Food & Beverage": "Needs",
  Health: "Needs",
  Transport: "Needs",
  Shopping: "Wants",
  Entertainment: "Wants",
  Education: "Wants",
  Other: "Wants",
};

const LOCAL_STORAGE_KEY = "sf_cat_budgets_local";

function getLocalCategoryBudgets() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalCategoryBudgets(list) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}
}

function CategoryBudgetModal({ budgetItem, existingCategories, currentMonthlyBudget, onClose, onSave }) {
  const [category, setCategory] = useState(budgetItem?.category || "Food & Beverage");
  const [amount, setAmount] = useState(
    budgetItem?.amount !== undefined && budgetItem?.amount !== null && budgetItem?.amount !== ""
      ? budgetItem.amount.toString()
      : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = Boolean(budgetItem?.id || budgetItem?.isLocal);

  const availableCategories = CATEGORIES.filter(
    (c) => isEdit || c === category || !existingCategories.includes(c)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Nominal anggaran harus berupa angka lebih besar dari 0");
      return;
    }

    setError("");
    setLoading(true);
    try {
      // 1. Try server category budget endpoint
      let serverSaved = false;
      try {
        if (isEdit && budgetItem?.id && typeof budgetItem.id === "number") {
          await api.put(`/budget/categories/${budgetItem.id}`, { amount: numAmount });
        } else {
          await api.post("/budget/categories", { category, amount: numAmount });
        }
        serverSaved = true;
      } catch (apiErr) {
        // If server endpoint doesn't exist (404 on Azure), gracefully save locally & update total budget
        if (apiErr.response?.status === 404 || apiErr.response?.status === 405) {
          const localList = getLocalCategoryBudgets();
          const existingIdx = localList.findIndex((item) => item.category === category);
          if (existingIdx >= 0) {
            localList[existingIdx].amount = numAmount;
          } else {
            localList.push({
              id: "loc_" + Date.now(),
              category,
              amount: numAmount,
              isLocal: true,
            });
          }
          saveLocalCategoryBudgets(localList);

          // Also ensure monthly_budget on server is updated if it was 0
          if (!currentMonthlyBudget || currentMonthlyBudget < numAmount) {
            try {
              const totalAlloc = localList.reduce((acc, cur) => acc + (parseFloat(cur.amount) || 0), 0);
              await api.put("/budget", { monthly_budget: totalAlloc });
            } catch (ignore) {}
          }
          serverSaved = true;
        } else {
          throw apiErr;
        }
      }

      if (serverSaved) {
        onSave();
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Gagal menyimpan anggaran kategori");
    } finally {
      setLoading(false);
    }
  };

  const addPreset = (val) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + val).toString());
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-[#dcd9d5]">
          <h3 className="font-semibold text-[#28251d] text-base flex items-center gap-2">
            <Wallet size={18} className="text-[#01696f]" />
            {isEdit ? `Edit Anggaran: ${budgetItem.category}` : "Tambah Anggaran Kategori"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f3f0ec] text-[#7a7974]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#28251d] mb-1.5 uppercase tracking-wide">
              Kategori Pengeluaran
            </label>
            {isEdit ? (
              <div className="w-full px-3.5 py-2.5 border border-[#d4d1ca] rounded-lg text-sm bg-gray-100 text-gray-700 font-medium">
                {budgetItem.category}
              </div>
            ) : (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#d4d1ca] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f] bg-white font-medium text-[#28251d]"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c} ({CATEGORY_GROUPS[c] || "Needs"})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#28251d] mb-1.5 uppercase tracking-wide">
              Batas Anggaran Bulanan (Rp)
            </label>
            <input
              type="number"
              required
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Contoh: 1500000"
              className="w-full px-3.5 py-2.5 border border-[#d4d1ca] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f]"
            />
            {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
              <p className="text-xs text-[#01696f] font-semibold mt-1">
                {formatRupiah(Number(amount))}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs text-[#7a7974] mb-2 font-medium">Tambah Cepat Nominal:</p>
            <div className="flex gap-2 flex-wrap">
              {[100000, 250000, 500000, 1000000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => addPreset(val)}
                  className="px-2.5 py-1 text-xs border border-[#dcd9d5] rounded-md bg-[#f9f8f5] hover:bg-[#f3f0ec] text-[#28251d] transition-colors"
                >
                  +{formatRupiah(val).replace("Rp ", "")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-[#d4d1ca] rounded-lg text-sm text-[#7a7974] hover:bg-[#f3f0ec]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-[#01696f] hover:bg-[#0c4e54] text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
            >
              <Save size={15} /> {loading ? "Menyimpan..." : "Simpan Anggaran"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TotalBudgetModal({ currentBudget, onClose, onSave }) {
  const [amount, setAmount] = useState(
    currentBudget !== undefined && currentBudget !== null && currentBudget !== ""
      ? currentBudget.toString()
      : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) {
      setError("Total budget harus berupa angka positif atau 0");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.put("/budget", { monthly_budget: num });
      onSave();
    } catch (err) {
      setError("Gagal memperbarui total budget");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-[#dcd9d5]">
          <h3 className="font-semibold text-[#28251d] text-base flex items-center gap-2">
            <Wallet size={18} className="text-[#01696f]" /> Pengaturan Total Budget Bulanan
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f3f0ec] text-[#7a7974]">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-[#28251d] mb-1.5 uppercase tracking-wide">
              Target Batas Pengeluaran Total Per Bulan (Rp)
            </label>
            <input
              type="number"
              required
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Contoh: 5000000"
              className="w-full px-3.5 py-2.5 border border-[#d4d1ca] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f]"
            />
            {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
              <p className="text-xs text-[#01696f] font-semibold mt-1">
                {formatRupiah(Number(amount))}
              </p>
            )}
          </div>
          <p className="text-xs text-[#7a7974] leading-relaxed">
            Total budget ini menjadi acuan batas maksimal seluruh pengeluaran bulanan Anda. Anda juga dapat menentukan alokasi per kategori di bawah.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-[#d4d1ca] rounded-lg text-sm text-[#7a7974] hover:bg-[#f3f0ec]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-[#01696f] hover:bg-[#0c4e54] text-white rounded-lg text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              <Save size={15} /> {loading ? "Menyimpan..." : "Simpan Total Budget"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BudgetPage() {
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalCategory, setModalCategory] = useState(null);
  const [modalTotal, setModalTotal] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchBudget = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch server budget info
      let budgetData = {
        monthly_budget: 0,
        monthly_income: 0,
        budget_used: 0,
        budget_remaining: 0,
        budget_percentage: 0,
        category_budgets: [],
      };

      try {
        const { data } = await api.get("/budget");
        budgetData = { ...budgetData, ...data };
      } catch (err) {
        console.warn("Server /budget get note:", err.message);
      }

      // 2. Fetch current month transactions to ensure accurate category expenses
      let categorySpent = {};
      try {
        const now = new Date();
        const m = now.getMonth() + 1;
        const y = now.getFullYear();
        const { data: txList } = await api.get(`/transactions?month=${m}&year=${y}`);
        if (Array.isArray(txList)) {
          txList.forEach((tx) => {
            if (tx.type === "expense") {
              const cat = tx.category || "Other";
              categorySpent[cat] = (categorySpent[cat] || 0) + (parseFloat(tx.amount) || 0);
            }
          });
        }
      } catch (ignore) {}

      // 3. Handle category budgets (server or fallback local storage)
      let catBudgets = Array.isArray(budgetData.category_budgets) && budgetData.category_budgets.length > 0
        ? budgetData.category_budgets
        : getLocalCategoryBudgets();

      // Recalculate spent/remaining/pct for all category budgets
      const processedCatBudgets = catBudgets.map((cb) => {
        const amt = parseFloat(cb.amount) || 0;
        const spent = categorySpent[cb.category] !== undefined ? categorySpent[cb.category] : (parseFloat(cb.spent) || 0);
        const rem = amt - spent;
        const pct = amt > 0 ? (spent / amt) * 100 : 0;
        let st = "safe";
        if (pct > 100) st = "danger";
        else if (pct >= 80) st = "warning";

        return {
          ...cb,
          amount: amt,
          spent,
          remaining: rem,
          percentage: pct,
          status: st,
          group: CATEGORY_GROUPS[cb.category] || "Wants",
        };
      });

      const totalCatBudget = processedCatBudgets.reduce((sum, c) => sum + c.amount, 0);
      const effectiveBudget = budgetData.monthly_budget > 0 ? budgetData.monthly_budget : totalCatBudget;
      const totalUsed = Object.values(categorySpent).reduce((a, b) => a + b, budgetData.budget_used || 0);
      const used = Math.max(budgetData.budget_used || 0, totalUsed);

      setBudget({
        ...budgetData,
        total_category_budget: totalCatBudget,
        category_budgets: processedCatBudgets,
        budget_used: used,
        budget_remaining: effectiveBudget - used,
        budget_percentage: effectiveBudget > 0 ? (used / effectiveBudget) * 100 : 0,
      });
      setError("");
    } catch (e) {
      console.error(e);
      setError("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  const handleDeleteCategory = async (id, categoryName) => {
    if (!confirm(`Hapus anggaran untuk kategori "${categoryName}"?`)) return;
    try {
      try {
        if (typeof id === "number") {
          await api.delete(`/budget/categories/${id}`);
        }
      } catch (ignore) {}

      // Also clean up local list
      const localList = getLocalCategoryBudgets().filter((item) => item.category !== categoryName && item.id !== id);
      saveLocalCategoryBudgets(localList);

      setSuccessMsg(`Anggaran kategori ${categoryName} berhasil dihapus`);
      setTimeout(() => setSuccessMsg(""), 4000);
      await fetchBudget();
    } catch (e) {
      setError("Gagal menghapus anggaran kategori");
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        "Peringatan: Reset akan mengosongkan total budget dan menghapus seluruh anggaran kategori yang telah diatur. Lanjutkan?"
      )
    )
      return;

    try {
      try {
        await api.delete("/budget");
      } catch (ignore) {}
      saveLocalCategoryBudgets([]);
      await fetchBudget();
      setSuccessMsg("Seluruh anggaran berhasil direset");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e) {
      setError("Gagal reset anggaran");
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-[#dcd9d5] h-64 skeleton" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-[#dcd9d5] h-48 skeleton" />
          <div className="bg-white rounded-xl border border-[#dcd9d5] h-48 skeleton" />
        </div>
      </div>
    );
  }

  const categoryBudgets = budget?.category_budgets || [];
  const existingCategoryNames = categoryBudgets.map((c) => c.category);
  const unbudgetedCategories = CATEGORIES.filter((c) => !existingCategoryNames.includes(c));

  const budgetPct = budget?.budget_percentage ?? 0;
  const isOverBudget = budgetPct > 100;
  const isNearLimit = budgetPct >= 80 && budgetPct <= 100;
  const hasBudget = (budget?.monthly_budget ?? 0) > 0 || (budget?.total_category_budget ?? 0) > 0;
  const effectiveTotalBudget =
    budget?.monthly_budget > 0 ? budget.monthly_budget : budget?.total_category_budget || 0;

  const overBudgetCategories = categoryBudgets.filter((c) => c.status === "danger");
  const warningBudgetCategories = categoryBudgets.filter((c) => c.status === "warning");

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Modals */}
      {modalCategory && (
        <CategoryBudgetModal
          key={modalCategory === "new" ? "new" : modalCategory.id || modalCategory.category}
          budgetItem={modalCategory === "new" ? null : modalCategory}
          existingCategories={existingCategoryNames}
          currentMonthlyBudget={budget?.monthly_budget}
          onClose={() => setModalCategory(null)}
          onSave={() => {
            setModalCategory(null);
            setSuccessMsg("Anggaran kategori berhasil disimpan!");
            setTimeout(() => setSuccessMsg(""), 4000);
            fetchBudget();
          }}
        />
      )}

      {modalTotal && (
        <TotalBudgetModal
          currentBudget={budget?.monthly_budget ?? 0}
          onClose={() => setModalTotal(false)}
          onSave={() => {
            setModalTotal(false);
            setSuccessMsg("Total budget bulanan berhasil diperbarui!");
            setTimeout(() => setSuccessMsg(""), 4000);
            fetchBudget();
          }}
        />
      )}

      {/* Main Budget Card */}
      <div className="bg-white rounded-xl border border-[#dcd9d5] p-5 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-semibold text-[#28251d] text-lg md:text-xl flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#01696f]/10 flex items-center justify-center text-[#01696f]">
                <Wallet size={19} />
              </div>
              Manajemen Anggaran (Budgeting)
            </h2>
            <p className="text-xs md:text-sm text-[#7a7974] mt-1">
              Rencanakan batas pengeluaran bulanan Anda per kategori untuk menjaga stabilitas finansial.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setModalTotal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-[#dcd9d5] hover:bg-[#f3f0ec] rounded-lg text-xs font-semibold text-[#28251d] transition-colors"
            >
              <Pencil size={13} /> Atur Total Budget
            </button>
            <button
              onClick={() => setModalCategory("new")}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#01696f] hover:bg-[#0c4e54] text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus size={14} /> Tambah Anggaran Kategori
            </button>
            <button
              onClick={fetchBudget}
              className="p-2 rounded-lg hover:bg-[#f3f0ec] text-[#7a7974] transition-colors"
              title="Refresh data"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-red-500 font-bold ml-2">
              <X size={14} />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle size={15} className="text-emerald-600" /> {successMsg}
            </span>
            <button onClick={() => setSuccessMsg("")} className="text-emerald-600 font-bold ml-2">
              <X size={14} />
            </button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          <div className="bg-[#f9f8f5] rounded-xl p-4 border border-[#f3f0ec]">
            <p className="text-xs text-[#7a7974] mb-1 font-medium">
              Pemasukan Bulan Ini <span className="text-[11px] text-[#01696f]">(Aktual)</span>
            </p>
            <p className="text-base md:text-lg font-bold text-[#28251d]">
              {formatRupiah(budget?.monthly_income ?? 0)}
            </p>
          </div>

          <div className="bg-[#f9f8f5] rounded-xl p-4 border border-[#f3f0ec] relative group">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#7a7974] mb-1 font-medium">Total Budget Bulanan</p>
              <button
                onClick={() => setModalTotal(true)}
                className="text-xs text-[#01696f] hover:underline font-semibold flex items-center gap-0.5"
              >
                <Pencil size={12} /> Edit
              </button>
            </div>
            <p className="text-base md:text-lg font-bold text-[#01696f]">
              {formatRupiah(effectiveTotalBudget)}
            </p>
          </div>

          <div className="bg-[#f9f8f5] rounded-xl p-4 border border-[#f3f0ec]">
            <p className="text-xs text-[#7a7974] mb-1 font-medium">Pengeluaran Aktual</p>
            <p
              className={`text-base md:text-lg font-bold ${
                isOverBudget ? "text-red-500" : "text-[#28251d]"
              }`}
            >
              {formatRupiah(budget?.budget_used ?? 0)}
            </p>
          </div>

          <div className="bg-[#f9f8f5] rounded-xl p-4 border border-[#f3f0ec]">
            <p className="text-xs text-[#7a7974] mb-1 font-medium">Sisa Budget Keseluruhan</p>
            <p
              className={`text-base md:text-lg font-bold ${
                isOverBudget ? "text-red-500" : "text-emerald-600"
              }`}
            >
              {formatRupiah(budget?.budget_remaining ?? 0)}
            </p>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="bg-[#f9f8f5] rounded-xl p-4 border border-[#f3f0ec] mb-6">
          <div className="flex justify-between items-center text-xs mb-2 font-medium">
            <span className="text-[#28251d] font-semibold flex items-center gap-1.5">
              <Layers size={14} className="text-[#01696f]" /> Realisasi Pengeluaran Total terhadap Budget
            </span>
            <span
              className={`font-bold tabular-nums ${
                isOverBudget ? "text-red-500" : isNearLimit ? "text-amber-600" : "text-[#01696f]"
              }`}
            >
              {budgetPct.toFixed(1)}% Terpakai
            </span>
          </div>
          <div className="w-full bg-[#e8e5df] rounded-full h-3.5 overflow-hidden">
            <div
              className={`h-3.5 rounded-full transition-all duration-500 ${
                isOverBudget
                  ? "bg-red-500"
                  : isNearLimit
                  ? "bg-amber-500"
                  : "bg-[#01696f]"
              }`}
              style={{ width: `${Math.min(100, budgetPct)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-[#7a7974] mt-2">
            <span>Terpakai: {formatRupiah(budget?.budget_used ?? 0)}</span>
            <span>Batas: {formatRupiah(effectiveTotalBudget)}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2.5 items-center justify-between pt-2 border-t border-[#f3f0ec]">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setModalTotal(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-[#dcd9d5] hover:bg-[#f3f0ec] rounded-lg text-xs font-semibold text-[#28251d] transition-colors"
            >
              <Pencil size={13} /> Atur Total Budget
            </button>
            <button
              onClick={() => setModalCategory("new")}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#01696f]/10 text-[#01696f] hover:bg-[#01696f]/20 rounded-lg text-xs font-semibold transition-colors"
            >
              <Plus size={13} /> Tambah Anggaran Kategori
            </button>
          </div>

          {hasBudget && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors"
            >
              <Trash2 size={13} /> Reset Semua Anggaran
            </button>
          )}
        </div>
      </div>

      {/* Critical / Warning Alerts */}
      {overBudgetCategories.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-red-900">
              Perhatian: {overBudgetCategories.length} Kategori Melebihi Anggaran!
            </p>
            <p className="mt-1">
              Kategori berikut telah melampaui batas anggaran yang ditetapkan:{" "}
              <strong>{overBudgetCategories.map((c) => c.category).join(", ")}</strong>. Pertimbangkan untuk mengurangi pengeluaran pada pos ini.
            </p>
          </div>
        </div>
      )}

      {warningBudgetCategories.length > 0 && overBudgetCategories.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-amber-900">
              Peringatan: {warningBudgetCategories.length} Kategori Mendekati Batas (&gt;80%)
            </p>
            <p className="mt-1">
              Pengeluaran untuk kategori{" "}
              <strong>{warningBudgetCategories.map((c) => c.category).join(", ")}</strong> sudah
              mencapai lebih dari 80% dari anggaran yang dialokasikan.
            </p>
          </div>
        </div>
      )}

      {/* Section: Category Budgets List / Grid */}
      <div className="bg-white rounded-xl border border-[#dcd9d5] p-5 md:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f3f0ec] pb-4">
          <div>
            <h3 className="font-bold text-[#28251d] text-base">Alokasi Anggaran per Kategori</h3>
            <p className="text-xs text-[#7a7974] mt-0.5">
              Pantau realisasi belanja bulanan pada masing-masing kategori pengeluaran
            </p>
          </div>
          <button
            onClick={() => setModalCategory("new")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#01696f] hover:bg-[#0c4e54] text-white rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto"
          >
            <Plus size={13} /> Tambah Kategori
          </button>
        </div>

        {categoryBudgets.length === 0 ? (
          <div className="p-8 text-center bg-[#f9f8f5] rounded-xl border border-dashed border-[#dcd9d5] space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#01696f]/10 text-[#01696f] flex items-center justify-center mx-auto">
              <Wallet size={24} />
            </div>
            <h4 className="font-bold text-[#28251d] text-sm">Belum Ada Anggaran Kategori</h4>
            <p className="text-xs text-[#7a7974] max-w-md mx-auto">
              Klik tombol <strong>Tambah Anggaran Kategori</strong> di bawah untuk menetapkan batas belanja per kategori, atau gunakan <strong>Atur Total Budget</strong>.
            </p>
            <div className="flex justify-center gap-3 pt-2 flex-wrap">
              <button
                onClick={() => setModalTotal(true)}
                className="flex items-center gap-1.5 px-4 py-2 border border-[#dcd9d5] bg-white hover:bg-[#f3f0ec] text-[#28251d] rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Pencil size={13} /> Atur Total Budget
              </button>
              <button
                onClick={() => setModalCategory("new")}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#01696f] hover:bg-[#0c4e54] text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus size={14} /> Tambah Anggaran Kategori
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryBudgets.map((cb) => {
              const Icon = CATEGORY_ICONS[cb.category] || MoreHorizontal;
              const isOver = cb.percentage > 100;
              const isWarn = cb.percentage >= 80 && cb.percentage <= 100;

              return (
                <div
                  key={cb.id || cb.category}
                  className="bg-[#fdfcfb] rounded-xl border border-[#e8e5df] p-4.5 hover:border-[#01696f]/40 transition-all shadow-sm flex flex-col justify-between"
                >
                  <div>
                    {/* Header Item */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            cb.group === "Needs"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          <Icon size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-[#28251d] text-sm leading-tight">
                            {cb.category}
                          </h4>
                          <span className="text-[10px] font-semibold text-[#7a7974] uppercase tracking-wider">
                            {cb.group === "Needs" ? "Kebutuhan (Needs)" : "Keinginan (Wants)"}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          isOver
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : isWarn
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOver ? "bg-red-500" : isWarn ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                        />
                        {isOver ? "Terlampaui" : isWarn ? "Hampir Habis" : "Aman"}
                      </span>
                    </div>

                    {/* Progress & Numbers */}
                    <div className="space-y-1.5 mb-3">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-[#7a7974]">Terpakai</span>
                        <span
                          className={`tabular-nums ${
                            isOver ? "text-red-600 font-bold" : "text-[#28251d]"
                          }`}
                        >
                          {formatRupiah(cb.spent)} / {formatRupiah(cb.amount)}
                        </span>
                      </div>

                      <div className="w-full bg-[#ece9e4] rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-300 ${
                            isOver ? "bg-red-500" : isWarn ? "bg-amber-500" : "bg-[#01696f]"
                          }`}
                          style={{ width: `${Math.min(100, cb.percentage)}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[11px] text-[#7a7974] pt-0.5">
                        <span>
                          Sisa:{" "}
                          <strong
                            className={
                              cb.remaining < 0
                                ? "text-red-600 font-bold"
                                : "text-emerald-700 font-semibold"
                            }
                          >
                            {formatRupiah(cb.remaining)}
                          </strong>
                        </span>
                        <span className="font-semibold">{cb.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f3f0ec]">
                    <button
                      onClick={() => setModalCategory(cb)}
                      className="p-1.5 rounded-md hover:bg-[#f3f0ec] text-[#7a7974] hover:text-[#01696f] text-xs flex items-center gap-1 font-medium transition-colors"
                      title="Edit nominal"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cb.id, cb.category)}
                      className="p-1.5 rounded-md hover:bg-red-50 text-[#7a7974] hover:text-red-600 text-xs flex items-center gap-1 font-medium transition-colors"
                      title="Hapus kategori ini"
                    >
                      <Trash2 size={13} /> Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Add Unbudgeted Categories */}
        {unbudgetedCategories.length > 0 && (
          <div className="p-4 bg-[#f9f8f5] rounded-xl border border-[#e8e5df] space-y-2.5">
            <p className="text-xs font-bold text-[#28251d] uppercase tracking-wider flex items-center gap-1.5">
              <Plus size={13} className="text-[#01696f]" /> Kategori Belum Dianggarkan:
            </p>
            <div className="flex gap-2 flex-wrap">
              {unbudgetedCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setModalCategory({ category: cat, amount: "" })}
                  className="px-3 py-1.5 bg-white border border-[#dcd9d5] hover:border-[#01696f] hover:text-[#01696f] text-xs rounded-lg font-medium text-[#28251d] transition-all flex items-center gap-1 shadow-2xs"
                >
                  + {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
