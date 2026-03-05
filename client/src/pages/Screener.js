import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStock } from "../context/StockContext";
import { formatPrice, formatPercent, formatMarketCap, changeColor, changeColorBg } from "../utils/format";
import { RSIBadge } from "../components/TechnicalPanel";

const SORT_OPTIONS = [
  { key: "changePercent", label: "% Change",   dir: -1 },
  { key: "price",         label: "Price",       dir: -1 },
  { key: "marketCap",     label: "Market Cap",  dir: -1 },
  { key: "volume",        label: "Volume",      dir: -1 },
  { key: "peRatio",       label: "P/E Ratio",   dir:  1 },
];

const SECTORS = ["All", "Finance", "Technology", "Consumer", "Energy", "Healthcare", "Auto", "Telecom", "Materials", "Utilities", "Retail", "Conglomerate"];

export default function Screener() {
  const navigate = useNavigate();
  const { getEnrichedStocks } = useStock();
  const [sector, setSector]   = useState("All");
  const [sortKey, setSortKey] = useState("changePercent");
  const [sortDir, setSortDir] = useState(-1);
  const [search, setSearch]   = useState("");

  const enriched = getEnrichedStocks();

  const toggleSort = (key, defaultDir) => {
    if (sortKey === key) setSortDir((d) => -d);
    else { setSortKey(key); setSortDir(defaultDir); }
  };

  const filtered = useMemo(() => {
    let list = enriched;
    if (sector !== "All") list = list.filter((s) => s.sector === sector);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const av = a[sortKey] ?? (sortDir > 0 ? Infinity : -Infinity);
      const bv = b[sortKey] ?? (sortDir > 0 ? Infinity : -Infinity);
      return sortDir * (bv - av);
    });
  }, [enriched, sector, sortKey, sortDir, search]);

  const SortBtn = ({ k, defaultDir, label }) => (
    <button onClick={() => toggleSort(k, defaultDir)} style={{
      background: sortKey === k ? "rgba(249,115,22,0.15)" : "transparent",
      color: sortKey === k ? "#fb923c" : "#64748b",
      border: "none", cursor: "pointer", padding: "4px 8px",
      fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 11, borderRadius: 5,
      whiteSpace: "nowrap",
    }}>
      {label} {sortKey === k ? (sortDir > 0 ? "↑" : "↓") : ""}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#080f1e", color: "#e2e8f0", padding: "24px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: "#e2e8f0", margin: 0 }}>
            🔍 NSE Stock Screener
          </h2>
          <p style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>
            {filtered.length} of {enriched.length} NSE stocks · India
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text" placeholder="Search name or symbol..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ background: "#0d1829", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 14px", color: "#e2e8f0", fontFamily: "monospace", fontSize: 13, width: 240, outline: "none" }}
          />
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {SECTORS.map((s) => (
              <button key={s} onClick={() => setSector(s)} style={{
                border: "1px solid", borderRadius: 6, padding: "5px 10px", cursor: "pointer",
                fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, transition: "all 0.2s",
                background: sector === s ? "rgba(249,115,22,0.18)" : "transparent",
                color: sector === s ? "#fb923c" : "#64748b",
                borderColor: sector === s ? "#f97316" : "#1e293b",
              }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "#0d1829", border: "1px solid #1e293b", borderRadius: 12, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 0, padding: "10px 16px", borderBottom: "1px solid #1e293b", background: "#080f1e" }}>
            <span style={{ color: "#475569", fontSize: 11 }}>STOCK</span>
            {SORT_OPTIONS.map((o) => (
              <div key={o.key} style={{ display: "flex", justifyContent: "flex-end" }}>
                <SortBtn k={o.key} defaultDir={o.dir} label={o.label} />
              </div>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((s) => (
            <div key={s.symbol}
              onClick={() => navigate(`/stock/${encodeURIComponent(s.symbol)}`)}
              style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 0, padding: "11px 16px", borderBottom: "1px solid rgba(30,41,59,0.6)", cursor: "pointer", transition: "background 0.15s", alignItems: "center" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(249,115,22,0.05)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              {/* Stock info */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a5b4fc", fontFamily: "'Syne'", fontWeight: 800, fontSize: 10, flexShrink: 0 }}>
                  {s.symbol.replace(".NS", "").slice(0, 3)}
                </div>
                <div>
                  <div style={{ color: "#e2e8f0", fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>{s.symbol.replace(".NS", "")}</div>
                  <div style={{ color: "#475569", fontSize: 11, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                  <div style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8", padding: "1px 5px", borderRadius: 3, fontSize: 9, display: "inline-block", marginTop: 2 }}>{s.sector}</div>
                </div>
              </div>

              {/* % Change */}
              <div style={{ textAlign: "right" }}>
                <div style={{ ...changePill, background: changeColorBg(s.changePercent), color: changeColor(s.changePercent) }}>
                  {formatPercent(s.changePercent)}
                </div>
              </div>

              {/* Price */}
              <div style={{ textAlign: "right", color: "#e2e8f0", fontFamily: "monospace", fontSize: 13 }}>
                {formatPrice(s.price)}
              </div>

              {/* Market Cap */}
              <div style={{ textAlign: "right", color: "#94a3b8", fontFamily: "monospace", fontSize: 12 }}>
                {formatMarketCap(s.marketCap)}
              </div>

              {/* Volume */}
              <div style={{ textAlign: "right", color: "#94a3b8", fontFamily: "monospace", fontSize: 12 }}>
                {s.volume ? `${(s.volume / 1e5).toFixed(2)}L` : "—"}
              </div>

              {/* P/E */}
              <div style={{ textAlign: "right", color: s.peRatio ? "#e2e8f0" : "#475569", fontFamily: "monospace", fontSize: 13 }}>
                {s.peRatio ? s.peRatio.toFixed(1) : "—"}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#475569" }}>
              No stocks match your filter
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const changePill = { padding: "3px 10px", borderRadius: 5, fontSize: 12, fontFamily: "monospace", display: "inline-block" };
