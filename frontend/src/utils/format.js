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

export const STATUS_LABEL = { safe: "Aman", caution: "Perhatian", warning: "Waspada", danger: "Bahaya" };

export const STATUS_COLOR = {
  safe: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", bar: "bg-green-500" },
  caution: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", bar: "bg-yellow-500" },
  warning: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", bar: "bg-orange-500" },
  danger: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", bar: "bg-red-500" },
};
