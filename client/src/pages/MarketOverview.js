import React from "react";
import { useNavigate } from "react-router-dom";
import { useStock } from "../context/StockContext";
import { formatPrice, formatPercent, formatMarketCap, changeColor, changeColorBg } from "../utils/format";

const SECTOR_ORDER = ["Finance", "Technology", "Consumer", "Energy", "Healthcare", "Auto", "Telecom", "Materials", "Utilities", "Retail", "Conglomerate"];

export default function MarketOverview() {
  const navigate = useNavigate();
  const { marketOverview, getEnrichedStocks } = useStock();
  const enriched = getEnrichedStocks();

  // Group by sector
  const bySector = SECTOR_ORDER.map((sec) => ({
    sector: sec,
    stocks: enriched.filter((s) => s.sector === sec),
  })).filter((g) => g.stocks.length > 0);

  return (
    <div style={{ minHeight: "100vh", background: "#080f1e", color: "#e2e8f0", padding: "24px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: "#e2e8f0", marginBottom: 4 }}>
          🇮🇳 Indian Market Overview
        </h2>
        <p style={{ color: "#475569", fontSize: 13, marginBottom: 20 }}>NSE · Tracking {enriched.length} large-cap stocks</p>

        {/* Indices */}
        {marketOverview.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 24 }}>
            {marketOverview.map((idx) => (
              <div key={idx.symbol} style={{ background: "#0d1829", border: "1px solid #1e293b", borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ color: "#64748b", fontSize: 11, fontFamily: "'Syne'" }}>{idx.name}</div>
                <div style={{ color: "#e2e8f0", fontFamily: "monospace", fontWeight: 700, fontSize: 22, marginTop: 4 }}>
                  {idx.quote?.price ? `₹${Number(idx.quote.price).toLocaleString("en-IN")}` : "—"}
                </div>
                <div style={{ color: changeColor(idx.quote?.changePercent), fontFamily: "monospace", fontSize: 14, marginTop: 4 }}>
                  {formatPercent(idx.quote?.changePercent)}
                  <span style={{ color: "#475569", fontSize: 12, marginLeft: 6 }}>({idx.quote?.change?.toFixed(2)})</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* By sector */}
        {bySector.map(({ sector, stocks }) => {
          const avgChange = stocks.reduce((a, s) => a + (s.changePercent || 0), 0) / stocks.length;
          return (
            <div key={sector} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>{sector}</span>
                <span style={{ color: "#475569", fontSize: 11 }}>{stocks.length} stocks</span>
                <span style={{ color: changeColor(avgChange), fontFamily: "monospace", fontSize: 12 }}>
                  avg {formatPercent(avgChange)}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                {stocks.map((s) => (
                  <div key={s.symbol}
                    onClick={() => navigate(`/stock/${encodeURIComponent(s.symbol)}`)}
                    style={{ background: "#0d1829", border: "1px solid #1e293b", borderRadius: 10, padding: "12px 14px", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#f97316"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1e293b"; e.currentTarget.style.transform = "none"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#e2e8f0", fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>{s.symbol.replace(".NS", "")}</span>
                      <span style={{ ...pill, background: changeColorBg(s.changePercent), color: changeColor(s.changePercent) }}>
                        {formatPercent(s.changePercent)}
                      </span>
                    </div>
                    <div style={{ color: "#475569", fontSize: 11, marginTop: 2, marginBottom: 6 }}>{s.name}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: 13 }}>{formatPrice(s.price)}</span>
                      <span style={{ color: "#334155", fontSize: 11 }}>{formatMarketCap(s.marketCap)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const pill = { padding: "2px 8px", borderRadius: 4, fontSize: 11, fontFamily: "monospace" };
