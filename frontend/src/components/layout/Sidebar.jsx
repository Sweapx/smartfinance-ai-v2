import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Receipt, PieChart, TrendingUp, Wallet, LogOut, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transaksi", icon: Receipt },
  { to: "/budget", label: "Anggaran", icon: Wallet },
  { to: "/allocation", label: "Alokasi 50/30/20", icon: PieChart },
  { to: "/prediction", label: "Prediksi", icon: TrendingUp },
];

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();

  return (
    <aside className="w-60 bg-white border-r border-[#dcd9d5] h-screen flex flex-col fixed left-0 top-0 z-40">
      <div className="p-5 flex items-center justify-between border-b border-[#f3f0ec]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-[#01696f] rounded-lg flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M3 3v18h18" /><path d="M18.7 8l-5.1 5.2-4-4L3 16" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-[#28251d] text-sm leading-tight">SmartFinance</p>
            <p className="text-xs text-[#7a7974] leading-tight">AI Dashboard</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1.5 text-[#7a7974] hover:bg-[#f3f0ec] rounded-lg">
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-[#01696f]/10 text-[#01696f]" : "text-[#7a7974] hover:bg-[#f3f0ec] hover:text-[#28251d]"
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-[#f3f0ec]">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-[#dcd9d5] flex items-center justify-center text-xs font-semibold text-[#28251d]">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#28251d] truncate">{user?.name}</p>
            <p className="text-xs text-[#7a7974] truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#7a7974] hover:bg-red-50 hover:text-red-600 transition-colors">
          <LogOut size={16} /> Keluar
        </button>
      </div>
    </aside>
  );
}
