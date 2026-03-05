import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStock } from "../context/StockContext";
import { useStockDetail } from "../hooks/useStockDetail";
import { PriceChart } from "../components/Charts";
import { TechnicalPanel } from "../components/TechnicalPanel";
import { NewsFeed } from "../components/NewsFeed";
import { formatPrice, formatPercent, formatNumber, formatMarketCap, changeColor } from "../utils/format";

const PERIODS = [
  { key: "1wk", label: "1W" }, { key: "1mo", label: "1M" }, { key: "3mo", label: "3M" },
  { key: "6mo", label: "6M" }, { key: "1y",  label: "1Y" }, { key: "2y",  label: "2Y" },
];
const TABS = [
  { key: "chart",        label: "📈 Chart"         },
  { key: "technicals",   label: "⚙️ Technicals"     },
  { key: "fundamentals", label: "📊 Fundamentals"   },
  { key: "news",         label: "📰 News"            },
];

export default function StockDetail() {
  const { symbol }  = useParams();
  const navigate    = useNavigate();
  const { allStocks, quotes } = useStock();
  const decoded     = decodeURIComponent(symbol);
  const { data, loading, period, setPeriod } = useStockDetail(decoded);
  const [tab, setTab] = useState("chart");

  const meta  = allStocks.find((s) => s.symbol === decoded) || {};
  const quote = data.summary?.quote || quotes[decoded] || {};

  return (
    <div style={{ minHeight: "100vh", background: "#080f1e", color: "#e2e8f0", paddingBottom: 48 }}>
      <div style={{ padding: "12px 24px 0" }}>
        <button onClick={() => navigate(-1)} style={S.back}>← Back to Dashboard</button>
      </div>

      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={S.symbol}>{decoded.replace(".NS", "")}</h1>
            <span style={S.nse}>NSE</span>
            {meta.sector && <span style={S.sector}>{meta.sector}</span>}
            <span style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80", padding: "2px 10px", borderRadius: 20, fontSize: 11 }}>
              ● NSE India
            </span>
          </div>
          <p style={{ color: "#64748b", fontFamily: "'Syne', sans-serif", marginTop: 4, fontSize: 15 }}>{quote.name || meta.name || decoded}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          {loading.summary
            ? <div style={{ color: "#475569" }}>Loading...</div>
            : <>
                <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 34, color: "#e2e8f0" }}>
                  {formatPrice(quote.price)}
                </div>
                <div style={{ color: changeColor(quote.changePercent), fontFamily: "monospace", fontSize: 20 }}>
                  {formatPercent(quote.changePercent)}
                  <span style={{ fontSize: 13, marginLeft: 8, color: "#64748b" }}>
                    ({quote.change >= 0 ? "+" : ""}{quote.change?.toFixed(2)})
                  </span>
                </div>
              </>
          }
        </div>
      </div>

      {/* Key metrics strip */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "12px 24px", background: "#0a1628", borderBottom: "1px solid #1e293b" }}>
        {[
          { label: "Open",       value: formatPrice(quote.open) },
          { label: "High",       value: formatPrice(quote.high) },
          { label: "Low",        value: formatPrice(quote.low) },
          { label: "Prev Close", value: formatPrice(quote.prevClose) },
          { label: "Volume",     value: formatNumber(quote.volume) },
          { label: "Avg Vol",    value: formatNumber(quote.avgVolume) },
          { label: "Mkt Cap",    value: formatMarketCap(quote.marketCap) },
          { label: "P/E",        value: quote.peRatio?.toFixed(1) || "—" },
          { label: "EPS",        value: quote.eps ? `₹${quote.eps.toFixed(2)}` : "—" },
          { label: "Div Yield",  value: quote.divYield ? `${quote.divYield.toFixed(2)}%` : "—" },
          { label: "52W High",   value: formatPrice(quote.high52) },
          { label: "52W Low",    value: formatPrice(quote.low52) },
          { label: "Beta",       value: quote.beta?.toFixed(2) || "—" },
        ].map((m) => (
          <div key={m.label} style={S.metric}>
            <div style={{ color: "#475569", fontSize: 10 }}>{m.label}</div>
            <div style={{ color: "#e2e8f0", fontFamily: "monospace", fontSize: 13, marginTop: 3 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", padding: "0 24px", borderBottom: "1px solid #1e293b", background: "rgba(8,15,30,0.9)" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: "none", border: "none", cursor: "pointer", padding: "12px 18px",
            fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 13,
            color: tab === t.key ? "#e2e8f0" : "#64748b",
            borderBottom: tab === t.key ? "2px solid #f97316" : "2px solid transparent",
            transition: "color 0.2s",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "20px 24px", maxWidth: 1400, margin: "0 auto" }}>
        {/* CHART */}
        {tab === "chart" && (
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={S.cardTitle}>Price History</span>
              <div style={{ display: "flex", gap: 4 }}>
                {PERIODS.map((p) => (
                  <button key={p.key} onClick={() => setPeriod(p.key)} style={{
                    border: "none", borderRadius: 5, padding: "4px 10px", cursor: "pointer",
                    fontFamily: "'Syne'", fontSize: 11, fontWeight: 600, transition: "all 0.2s",
                    background: period === p.key ? "#f97316" : "transparent",
                    color:      period === p.key ? "#fff" : "#64748b",
                  }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {loading.history
              ? <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}><LargeSpinner /></div>
              : <PriceChart data={data.history} symbol={decoded} sma20={data.technicals?.sma20} sma50={data.technicals?.sma50} currency="INR" height={300} />
            }
          </div>
        )}

        {/* TECHNICALS */}
        {tab === "technicals" && (
          <div style={S.card}>
            <div style={{ marginBottom: 14 }}>
              <span style={S.cardTitle}>Technical Analysis</span>
              <span style={{ color: "#475569", fontSize: 11, marginLeft: 10 }}>Based on {period} price data</span>
            </div>
            <TechnicalPanel technicals={data.technicals} quote={quote} region="INDIA" />
          </div>
        )}

        {/* FUNDAMENTALS */}
        {tab === "fundamentals" && (
          <FundamentalsPanel fundamentals={data.summary?.fundamentals} quote={quote} />
        )}

        {/* NEWS */}
        {tab === "news" && (
          <div style={S.card}>
            <div style={{ marginBottom: 14 }}><span style={S.cardTitle}>News & Sentiment — {quote.name || decoded}</span></div>
            <NewsFeed news={data.news} loading={loading.news} symbol={decoded} />
          </div>
        )}
      </div>
    </div>
  );
}

function FundamentalsPanel({ fundamentals, quote }) {
  if (!fundamentals) return (
    <div style={{ background: "#0d1829", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
      <div style={{ color: "#475569", textAlign: "center", padding: 30 }}>Loading fundamentals...</div>
    </div>
  );

  const fmtNum  = (v) => v != null ? (v > 1000 ? formatNumber(v) : Number(v).toFixed(2)) : "—";
  const fmtPct  = (v) => v != null ? `${(v * 100).toFixed(1)}%` : "—";
  const fmtINR  = (v) => v != null ? formatMarketCap(v) : "—";

  const sections = [
    {
      title: "Valuation",
      items: [
        { label: "P/E Ratio (TTM)",     value: fmtNum(quote.peRatio) },
        { label: "P/B Ratio",           value: fmtNum(fundamentals.pbRatio) },
        { label: "PEG Ratio",           value: fmtNum(fundamentals.pegRatio) },
        { label: "EPS (Annual)",        value: quote.eps ? `₹${Number(quote.eps).toFixed(2)}` : "—" },
      ],
    },
    {
      title: "Returns",
      items: [
        { label: "Return on Equity",    value: fmtPct(fundamentals.returnOnEquity) },
        { label: "Return on Assets",    value: fmtPct(fundamentals.returnOnAssets) },
        { label: "Gross Margin",        value: fmtPct(fundamentals.grossMargin) },
        { label: "Net Profit Margin",   value: fmtPct(fundamentals.netMargin) },
      ],
    },
    {
      title: "Growth (3Y CAGR)",
      items: [
        { label: "Revenue Growth",      value: fmtPct(fundamentals.revenueGrowth3Y) },
        { label: "EPS Growth",          value: fmtPct(fundamentals.epsGrowth3Y) },
        { label: "Dividend Yield",      value: quote.divYield ? `${Number(quote.divYield).toFixed(2)}%` : "—" },
        { label: "Beta",                value: fmtNum(quote.beta) },
      ],
    },
    {
      title: "Balance Sheet",
      items: [
        { label: "Debt / Equity",       value: fmtNum(fundamentals.debtToEquity) },
        { label: "Current Ratio",       value: fmtNum(fundamentals.currentRatio) },
        { label: "Market Cap",          value: formatMarketCap(quote.marketCap) },
        { label: "52W High",            value: formatPrice(quote.high52) },
      ],
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
      {sections.map((sec) => (
        <div key={sec.title} style={{ background: "#0d1829", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: "#e2e8f0", marginBottom: 12, borderBottom: "1px solid #1e293b", paddingBottom: 8 }}>
            {sec.title}
          </div>
          {sec.items.map((item) => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(30,41,59,0.6)" }}>
              <span style={{ color: "#64748b", fontSize: 12 }}>{item.label}</span>
              <span style={{ color: "#e2e8f0", fontFamily: "monospace", fontSize: 12 }}>{item.value}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function LargeSpinner() {
  return <div style={{ width: 36, height: 36, border: "3px solid #1e293b", borderTop: "3px solid #f97316", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />;
}

const S = {
  back:     { background: "transparent", border: "1px solid #1e293b", color: "#64748b", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontFamily: "'Syne'", fontSize: 13 },
  header:   { padding: "16px 24px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, borderBottom: "1px solid #1e293b" },
  symbol:   { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 30, color: "#e2e8f0", margin: 0 },
  nse:      { background: "rgba(249,115,22,0.15)", color: "#fb923c", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700 },
  sector:   { background: "rgba(99,102,241,0.12)", color: "#a5b4fc", padding: "3px 10px", borderRadius: 6, fontSize: 11 },
  metric:   { background: "#0d1829", padding: "8px 14px", borderRadius: 7, minWidth: 100, margin: "3px" },
  card:     { background: "#0d1829", border: "1px solid #1e293b", borderRadius: 12, padding: 20, marginBottom: 16 },
  cardTitle:{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: "#e2e8f0" },
};
