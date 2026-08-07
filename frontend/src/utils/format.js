export const formatRupiah = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
};

export const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

export const CATEGORIES = ["Food & Beverage", "Transport", "Bills", "Health", "Shopping", "Entertainment", "Education", "Other"];

export const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export const CATEGORY_COLORS = {
  "Food & Beverage": "#01696f",
  Transport: "#006494",
  Bills: "#964219",
  Health: "#a12c7b",
  Shopping: "#da7101",
  Entertainment: "#d19900",
  Education: "#7a39bb",
  Other: "#7a7974",
};

export const STATUS_LABEL = {
  excellent: "Sangat Baik",
  safe: "Aman",
  caution: "Waspada",
  warning: "Waspada",
  danger: "Kritis",
  critical: "Kritis",
};

export const STATUS_COLOR = {
  excellent: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", bar: "bg-emerald-500", dot: "bg-emerald-500" },
  safe: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", bar: "bg-green-500", dot: "bg-green-500" },
  caution: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", bar: "bg-yellow-500", dot: "bg-yellow-500" },
  warning: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", bar: "bg-yellow-500", dot: "bg-yellow-500" },
  danger: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", bar: "bg-red-500", dot: "bg-red-500" },
  critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", bar: "bg-red-500", dot: "bg-red-500" },
};
