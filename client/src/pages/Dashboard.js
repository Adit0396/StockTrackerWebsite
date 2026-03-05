import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useStock } from "../context/StockContext";
import api from "../utils/api";
import { formatPrice, formatPercent, formatNumber, formatMarketCap, changeColor, changeColorBg } from "../utils/format";
import { MiniSparkline } from "../components/Charts";

const STRATEGIES = [
  { key: "momentum", label: "⚡ Momentum",    desc: "Strongest % gain today" },
  { key: "losers",   label: "📉 Losers",       desc: "Biggest % decline today" },
  { key: "value",    label: "💎 Value",         desc: "Lowest P/E ratio" },
  { key: "volume",   label: "📊 Volume Surge",  desc: "Highest volume today" },
];

const SECTORS = ["All", "Finance", "Technology", "Consumer", "Energy", "Healthcare", "Auto", "Telecom", "Materials", "Utilities", "Retail", "Conglomerate"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { marketOverview, getEnrichedStocks, quotesLoading, lastUpdated } = useStock();

  const [strategy, setStrategy]       = useState("momentum");
  const [sector, setSector]           = useState("All");
  const [rankedStocks, setRankedStocks] = useState([]);
  const [rankLoading, setRankLoading] = useState(false);
  const [sparklines, setSparklines]   = useState({});

  const enriched = getEnrichedStocks();

  // Filter by sector
  const displayed = sector === "All" ? enriched : enriched.filter((s) => s.sector === sector);

  // Ranked stocks
  const loadRanked = useCallback(async (strat) => {
    setRankLoading(true);
    try {
      const data = await api.getRanked(strat, 15);
      setRankedStocks(data);
    } catch (e) { console.error(e); }
    finally { setRankLoading(false); }
  }, []);

  useEffect(() => { loadRanked(strategy); }, [strategy, loadRanked]);

  // Sparklines for top 8
  useEffect(() => {
    if (!rankedStocks.length) return;
    Promise.allSettled(
      rankedStocks.slice(0, 8).map((s) =>
        api.getHistory(s.symbol, "1mo").then((h) => ({ symbol: s.symbol, data: h }))
      )
    ).then((res) => {
      const m = {};
      res.forEach((r) => { if (r.status === "fulfilled") m[r.value.symbol] = r.value.data; });
      setSparklines(m);
    });
  }, [rankedStocks]);

  // Stats
  const gainers   = enriched.filter((s) => (s.changePercent || 0) > 0).length;
  const losers    = enriched.filter((s) => (s.changePercent || 0) < 0).length;
  const avgChange = enriched.length ? enriched.reduce((a, b) => a + (b.changePercent || 0), 0) / enriched.length : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#080f1e" }}>
      {/* Ticker tape */}
      <TickerTape stocks={enriched} navigate={navigate} />

      {/* Stats bar */}
      <div style={{ display: "flex", gap: 12, padding: "12px 24px", borderBottom: "1px solid #1e293b", flexWrap: "wrap" }}>
        {[
          { label: "Tracking",    value: `${enriched.length} stocks`, color: "#f97316" },
          { label: "🟢 Gainers",  value: gainers,                    color: "#22c55e" },
          { label: "🔴 Losers",   value: losers,                     color: "#ef4444" },
          { label: "Avg Move",    value: formatPercent(avgChange),    color: avgChange >= 0 ? "#22c55e" : "#ef4444" },
          { label: "Updated",     value: lastUpdated ? new Date(lastUpdated).toLocaleTimeString("en-IN") : "—", color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#0d1829", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 16px", display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ color: "#64748b", fontSize: 11 }}>{s.label}</span>
            <span style={{ color: s.color, fontFamily: "monospace", fontWeight: 700, fontSize: 15 }}>{s.value}</span>
          </div>
        ))}
        {quotesLoading && <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#f59e0b", fontSize: 12 }}><Spinner />Refreshing quotes...</div>}
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1600, margin: "0 auto" }}>
        {/* Market indices */}
        {marketOverview.length > 0 && (
          <div style={card}>
            <SectionTitle>🇮🇳 Indian Market Indices</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginTop: 12 }}>
              {marketOverview.map((idx) => (
                <div key={idx.symbol} style={{ background: "#080f1e", borderRadius: 10, padding: "14px 16px", border: "1px solid #1e293b" }}>
                  <div style={{ color: "#64748b", fontSize: 11 }}>{idx.name}</div>
                  <div style={{ color: "#e2e8f0", fontFamily: "monospace", fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                    {idx.quote?.price ? `₹${Number(idx.quote.price).toLocaleString("en-IN")}` : "—"}
                  </div>
                  <div style={{ color: changeColor(idx.quote?.changePercent), fontFamily: "monospace", fontSize: 13, marginTop: 2 }}>
                    {formatPercent(idx.quote?.changePercent)}
                    <span style={{ color: "#475569", marginLeft: 6, fontSize: 11 }}>({idx.quote?.change?.toFixed(2)})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16, alignItems: "start" }}>
          {/* Left: strategy ranker */}
          <div>
            <div style={card}>
              {/* Strategy selector */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {STRATEGIES.map((s) => (
                    <button key={s.key} onClick={() => setStrategy(s.key)} style={{
                      ...stratBtn,
                      background: strategy === s.key ? "rgba(249,115,22,0.2)" : "transparent",
                      color: strategy === s.key ? "#fb923c" : "#64748b",
                      borderColor: strategy === s.key ? "#f97316" : "#1e293b",
                    }}>
                      {s.label}
                    </button>
                  ))}
                </div>
                {rankLoading && <Spinner />}
              </div>

              <div style={{ color: "#475569", fontSize: 11, marginBottom: 12 }}>
                {STRATEGIES.find((s) => s.key === strategy)?.desc} · Top 15 of {enriched.length} NSE stocks
              </div>

              {rankedStocks.slice(0, 15).map((s, i) => (
                <div key={s.symbol}
                  onClick={() => navigate(`/stock/${encodeURIComponent(s.symbol)}`)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 3, borderLeft: i === 0 ? "3px solid #f97316" : i < 3 ? "3px solid #334155" : "3px solid transparent", transition: "background 0.15s" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(249,115,22,0.06)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  {/* Rank */}
                  <span style={{ minWidth: 26, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontWeight: 700, fontSize: 11, background: i < 3 ? ["rgba(249,115,22,0.2)","rgba(245,158,11,0.15)","rgba(148,163,184,0.1)"][i] : "rgba(30,41,59,0.6)", color: i < 3 ? ["#fb923c","#fcd34d","#cbd5e1"][i] : "#475569", flexShrink: 0 }}>
                    {i + 1}
                  </span>

                  {/* Name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#e2e8f0", fontFamily: "monospace", fontSize: 13 }}>{s.symbol.replace(".NS", "")}</div>
                    <div style={{ color: "#475569", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                  </div>

                  {/* Sparkline */}
                  <div style={{ width: 64 }}>
                    {sparklines[s.symbol] && <MiniSparkline data={sparklines[s.symbol].slice(-14)} color={changeColor(s.changePercent)} />}
                  </div>

                  {/* Sector */}
                  <div style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8", padding: "2px 7px", borderRadius: 4, fontSize: 10, flexShrink: 0 }}>
                    {s.sector}
                  </div>

                  {/* Price + change */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ color: "#e2e8f0", fontFamily: "monospace", fontSize: 13 }}>{formatPrice(s.price)}</div>
                    <div style={{ ...pill, background: changeColorBg(s.changePercent), color: changeColor(s.changePercent) }}>
                      {formatPercent(s.changePercent)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Fear & Greed */}
            <div style={card}>
              <SectionTitle>🧠 Market Sentiment</SectionTitle>
              <FearGreed stocks={enriched} />
            </div>

            {/* Top movers */}
            <div style={card}>
              <SectionTitle>🚀 Top Movers</SectionTitle>
              {[...enriched].sort((a, b) => Math.abs(b.changePercent || 0) - Math.abs(a.changePercent || 0)).slice(0, 6).map((s) => (
                <div key={s.symbol}
                  onClick={() => navigate(`/stock/${encodeURIComponent(s.symbol)}`)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 4px", borderRadius: 7, cursor: "pointer", transition: "background 0.15s", marginBottom: 2 }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(249,115,22,0.06)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div>
                    <div style={{ color: "#e2e8f0", fontFamily: "monospace", fontSize: 13 }}>{s.symbol.replace(".NS", "")}</div>
                    <div style={{ color: "#475569", fontSize: 11 }}>{s.sector}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#e2e8f0", fontFamily: "monospace", fontSize: 12 }}>{formatPrice(s.price)}</div>
                    <div style={{ color: changeColor(s.changePercent), fontFamily: "monospace", fontSize: 12 }}>{formatPercent(s.changePercent)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <SectionTitle>🗺️ NSE Heatmap</SectionTitle>
            {/* Sector filter */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {SECTORS.map((sec) => (
                <button key={sec} onClick={() => setSector(sec)} style={{
                  ...stratBtn, fontSize: 10, padding: "3px 8px",
                  background: sector === sec ? "rgba(249,115,22,0.2)" : "transparent",
                  color: sector === sec ? "#fb923c" : "#64748b",
                  borderColor: sector === sec ? "#f97316" : "#1e293b",
                }}>
                  {sec}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 6 }}>
            {displayed.map((s) => {
              const pct = s.changePercent || 0;
              const intensity = Math.min(1, Math.abs(pct) / 5);
              const bg = pct >= 0 ? `rgba(34,197,94,${0.07 + intensity * 0.5})` : `rgba(239,68,68,${0.07 + intensity * 0.5})`;
              return (
                <div key={s.symbol}
                  onClick={() => navigate(`/stock/${encodeURIComponent(s.symbol)}`)}
                  style={{ background: bg, border: `1px solid ${pct >= 0 ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`, borderRadius: 7, padding: "10px 8px", cursor: "pointer", transition: "transform 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
                >
                  <div style={{ color: "#e2e8f0", fontSize: 11, fontFamily: "monospace", fontWeight: 700 }}>{s.symbol.replace(".NS", "")}</div>
                  <div style={{ color: "#64748b", fontSize: 9, marginTop: 1 }}>{s.sector}</div>
                  <div style={{ color: pct >= 0 ? "#4ade80" : "#f87171", fontSize: 11, fontFamily: "monospace", marginTop: 4 }}>
                    {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                  </div>
                  <div style={{ color: "#64748b", fontSize: 10, fontFamily: "monospace" }}>{formatPrice(s.price)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TickerTape({ stocks, navigate }) {
  const items = [...stocks.slice(0, 20), ...stocks.slice(0, 20)];
  return (
    <div style={{ background: "#0a1628", borderBottom: "1px solid #1e293b", overflow: "hidden", height: 34, display: "flex", alignItems: "center" }}>
      <div style={{ display: "flex", whiteSpace: "nowrap", animation: "ticker 70s linear infinite", fontFamily: "monospace", fontSize: 12 }}>
        {items.map((s, i) => (
          <span key={i} onClick={() => navigate(`/stock/${encodeURIComponent(s.symbol)}`)}
            style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", marginRight: 8 }}>
            <span style={{ color: "#64748b" }}>{s.symbol.replace(".NS", "")}</span>
            <span style={{ color: "#cbd5e1", marginLeft: 5 }}>{s.price ? `₹${Number(s.price).toLocaleString("en-IN")}` : "—"}</span>
            <span style={{ color: changeColor(s.changePercent), marginLeft: 4 }}>
              {(s.changePercent || 0) >= 0 ? "▲" : "▼"}{Math.abs(s.changePercent || 0).toFixed(2)}%
            </span>
            <span style={{ color: "#1e293b", margin: "0 16px" }}>|</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function FearGreed({ stocks }) {
  const bullish = stocks.filter((s) => (s.changePercent || 0) > 0).length;
  const total   = stocks.length || 1;
  const score   = Math.round((bullish / total) * 100);
  const label   = score > 75 ? "Extreme Greed" : score > 60 ? "Greed" : score > 40 ? "Neutral" : score > 25 ? "Fear" : "Extreme Fear";
  const color   = score > 60 ? "#22c55e" : score > 40 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <div style={{ color, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 32 }}>{score}</div>
          <div style={{ color, fontSize: 13 }}>{label}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#22c55e", fontFamily: "monospace", fontSize: 13 }}>▲ {bullish} gaining</div>
          <div style={{ color: "#ef4444", fontFamily: "monospace", fontSize: 13, marginTop: 4 }}>▼ {total - bullish} declining</div>
        </div>
      </div>
      <div style={{ background: "linear-gradient(90deg,#ef4444 0%,#f59e0b 50%,#22c55e 100%)", borderRadius: 6, height: 8, position: "relative" }}>
        <div style={{ position: "absolute", top: "50%", left: `${score}%`, transform: "translate(-50%,-50%)", width: 18, height: 18, background: "#0f172a", border: `3px solid ${color}`, borderRadius: "50%", transition: "left 0.5s" }} />
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>{children}</div>;
}

function Spinner() {
  return <div style={{ width: 16, height: 16, border: "2px solid #1e293b", borderTop: "2px solid #f97316", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />;
}

const card    = { background: "#0d1829", border: "1px solid #1e293b", borderRadius: 12, padding: 20 };
const stratBtn = { border: "1px solid", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, transition: "all 0.2s" };
const pill    = { padding: "2px 8px", borderRadius: 4, fontSize: 11, fontFamily: "monospace", display: "inline-block" };
