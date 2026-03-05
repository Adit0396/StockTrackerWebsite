// ─── FORMAT UTILITIES — INR / Indian number system ───────────────────────────

export const formatPrice = (v) => {
  if (v == null || isNaN(v)) return "—";
  return `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatCurrency = (v, _currency, _region) => formatPrice(v);

export const formatMarketCap = (v) => {
  if (v == null || isNaN(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e12) return `₹${(v / 1e12).toFixed(2)}L Cr`;
  if (abs >= 1e9)  return `₹${(v / 1e9).toFixed(2)}K Cr`;
  if (abs >= 1e7)  return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5)  return `₹${(v / 1e5).toFixed(2)} L`;
  return `₹${v.toFixed(0)}`;
};

export const formatNumber = (v) => {
  if (v == null || isNaN(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e7) return `${(v / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${(v / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(2)} K`;
  return String(v);
};

export const formatPercent = (v, decimals = 2) => {
  if (v == null || isNaN(v)) return "—";
  return `${v >= 0 ? "+" : ""}${Number(v).toFixed(decimals)}%`;
};

export const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const timeAgo = (d) => {
  if (!d) return "";
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 60)  return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
};

export const changeColor   = (v) => (!v && v !== 0) ? "#94a3b8" : v >= 0 ? "#22c55e" : "#ef4444";
export const changeColorBg = (v) => (!v && v !== 0) ? "rgba(148,163,184,0.1)" : v >= 0 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)";

export const getCurrencySymbol = () => "₹";

// kept for backward compat with StockDetail
export const formatCurrencyLegacy = formatPrice;
