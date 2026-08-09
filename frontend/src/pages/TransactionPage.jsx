import React, { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Search, Filter, X, TrendingUp, TrendingDown } from "lucide-react";
import api from "../utils/api";
import { formatRupiah, formatDate, CATEGORIES, MONTHS } from "../utils/format";

function TransactionModal({ tx, onClose, onSave }) {
  const [form, setForm] = useState(() => {
    if (!tx) return { amount: "", category: "Food & Beverage", type: "expense", tx_date: new Date().toISOString().split("T")[0], description: "" };
    return tx.type === "income" ? { ...tx, category: "Income" } : tx;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const payload = { ...form, category: form.type === "income" ? "Income" : form.category };
      if (tx?.id) await api.put(`/transactions/${tx.id}`, payload);
      else await api.post("/transactions", payload);
      onSave();
    } catch (err) { setError(err.response?.data?.detail || "Gagal menyimpan"); }
    finally { setLoading(false); }
  };

  const handleTypeChange = (t) => {
    setForm((p) => ({
      ...p,
      type: t,
      category: t === "income" ? "Income" : (p.category === "Income" ? "Food & Beverage" : p.category),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-[#dcd9d5]">
          <h3 className="font-semibold text-[#28251d]">{tx?.id ? "Edit Transaksi" : "Tambah Transaksi"}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f3f0ec]"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <div className="flex rounded-lg border border-[#d4d1ca] overflow-hidden">
            {["expense", "income"].map((t) => (
              <button key={t} type="button" onClick={() => handleTypeChange(t)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${form.type === t ? (t === "expense" ? "bg-red-500 text-white" : "bg-[#01696f] text-white") : "text-[#7a7974] hover:bg-[#f3f0ec]"}`}>
                {t === "expense" ? "Pengeluaran" : "Pemasukan"}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#28251d] mb-1.5">Nominal (Rp)</label>
            <input type="number" required min="1" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              placeholder="0" className="w-full px-3.5 py-2.5 border border-[#d4d1ca] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f]" />
          </div>
          {form.type === "expense" ? (
            <div>
              <label className="block text-sm font-medium text-[#28251d] mb-1.5">Kategori Pengeluaran</label>
              <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-[#d4d1ca] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f] bg-white">
                {CATEGORIES.map((c) => (<option key={c}>{c}</option>))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-[#28251d] mb-1.5">Kategori Pemasukan</label>
              <input type="text" readOnly value="Income"
                className="w-full px-3.5 py-2.5 border border-[#d4d1ca] rounded-lg text-sm bg-gray-100 text-gray-700 cursor-not-allowed font-medium" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-[#28251d] mb-1.5">Tanggal</label>
            <input type="date" required value={form.tx_date} onChange={(e) => setForm((p) => ({ ...p, tx_date: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-[#d4d1ca] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#28251d] mb-1.5">Deskripsi <span className="text-[#7a7974] font-normal">(opsional)</span></label>
            <input type="text" value={form.description || ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Catatan tambahan..." className="w-full px-3.5 py-2.5 border border-[#d4d1ca] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f]" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-[#d4d1ca] rounded-lg text-sm text-[#7a7974] hover:bg-[#f3f0ec]">Batal</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-[#01696f] hover:bg-[#0c4e54] text-white rounded-lg text-sm font-medium disabled:opacity-60">{loading ? "Menyimpan..." : "Simpan"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TransactionPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [filters, setFilters] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), type: "" });
  const [search, setSearch] = useState("");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { month: filters.month, year: filters.year };
      if (filters.type) params.type = filters.type;
      const { data } = await api.get("/transactions", { params });
      setTransactions(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleDelete = async (id) => {
    if (!confirm("Hapus transaksi ini?")) return;
    await api.delete(`/transactions/${id}`);
    fetchTransactions();
  };

  const filtered = transactions.filter((tx) => !search || tx.description?.toLowerCase().includes(search.toLowerCase()) || tx.category.toLowerCase().includes(search.toLowerCase()));
  const totalIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="space-y-4 animate-fade-in">
      {modal && (
        <TransactionModal
          key={modal === "new" ? "new" : modal.id}
          tx={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => {
            setModal(null);
            fetchTransactions();
          }}
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 border border-[#dcd9d5] flex items-center gap-3">
          <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center"><TrendingUp size={17} className="text-green-600" /></div>
          <div><p className="text-xs text-[#7a7974]">Pemasukan</p><p className="font-semibold text-[#28251d] text-sm">{formatRupiah(totalIncome)}</p></div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#dcd9d5] flex items-center gap-3">
          <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center"><TrendingDown size={17} className="text-red-500" /></div>
          <div><p className="text-xs text-[#7a7974]">Pengeluaran</p><p className="font-semibold text-[#28251d] text-sm">{formatRupiah(totalExpense)}</p></div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#dcd9d5] p-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <select value={filters.month} onChange={(e) => setFilters((p) => ({ ...p, month: Number(e.target.value) }))} className="px-3 py-2 border border-[#d4d1ca] rounded-lg text-sm bg-white focus:outline-none focus:border-[#01696f]">
              {MONTHS.slice(1).map((m, i) => (<option key={i} value={i + 1}>{m}</option>))}
            </select>
            <select value={filters.year} onChange={(e) => setFilters((p) => ({ ...p, year: Number(e.target.value) }))} className="px-3 py-2 border border-[#d4d1ca] rounded-lg text-sm bg-white focus:outline-none focus:border-[#01696f]">
              {[2024, 2025, 2026].map((y) => (<option key={y}>{y}</option>))}
            </select>
            <select value={filters.type} onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))} className="px-3 py-2 border border-[#d4d1ca] rounded-lg text-sm bg-white focus:outline-none focus:border-[#01696f]">
              <option value="">Semua Tipe</option><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option>
            </select>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a7974]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari..." className="pl-8 pr-3 py-2 border border-[#d4d1ca] rounded-lg text-sm w-40 focus:outline-none focus:border-[#01696f]" />
            </div>
            <button onClick={() => setModal("new")} className="flex items-center gap-1.5 px-3 py-2 bg-[#01696f] hover:bg-[#0c4e54] text-white rounded-lg text-sm font-medium"><Plus size={15} /> Tambah</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#dcd9d5] overflow-hidden">
        {loading ? (<div className="p-8 text-center text-[#7a7974] text-sm">Memuat data...</div>) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Filter size={32} className="mx-auto mb-3 text-[#bab9b4]" />
            <p className="text-sm text-[#7a7974]">Tidak ada transaksi ditemukan</p>
            <button onClick={() => setModal("new")} className="mt-3 text-sm text-[#01696f] hover:underline">+ Tambah transaksi baru</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f3f0ec] bg-[#f9f8f5]">
                  {["Tanggal", "Kategori", "Deskripsi", "Tipe", "Nominal", "Aksi"].map((h) => (<th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#7a7974] uppercase tracking-wide">{h}</th>))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f0ec]">
                {filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#f9f8f5] transition-colors">
                    <td className="px-4 py-3 text-sm text-[#7a7974] whitespace-nowrap">{formatDate(tx.tx_date)}</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#f3f0ec] text-[#28251d]">{tx.type === "income" ? "Income" : tx.category}</span></td>
                    <td className="px-4 py-3 text-sm text-[#7a7974] max-w-xs truncate">{tx.description || "-"}</td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tx.type === "income" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{tx.type === "income" ? "Masuk" : "Keluar"}</span></td>
                    <td className={`px-4 py-3 text-sm font-semibold tabular-nums ${tx.type === "income" ? "text-green-600" : "text-red-500"}`}>{tx.type === "income" ? "+" : "-"}{formatRupiah(tx.amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setModal(tx)} className="p-1.5 rounded hover:bg-[#f3f0ec] text-[#7a7974] hover:text-[#28251d]"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(tx.id)} className="p-1.5 rounded hover:bg-red-50 text-[#7a7974] hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
