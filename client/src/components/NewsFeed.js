import React from "react";
import { timeAgo } from "../utils/format";

const SENTIMENT_CONFIG = {
  Positive: { bg: "rgba(34,197,94,0.08)", border: "#22c55e", textColor: "#4ade80", label: "🟢 BULLISH", textBody: "#86efac" },
  Negative: { bg: "rgba(239,68,68,0.08)", border: "#ef4444", textColor: "#f87171", label: "🔴 BEARISH", textBody: "#fca5a5" },
  Neutral:  { bg: "rgba(30,41,59,0.4)",   border: "#334155", textColor: "#94a3b8", label: "⚪ NEUTRAL",  textBody: "#94a3b8" },
};

function NewsCard({ article }) {
  const sentiment = article.sentiment?.label || "Neutral";
  const cfg = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.Neutral;

  return (
    <a
      href={article.url !== "#" ? article.url : undefined}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        style={{
          background: cfg.bg,
          borderLeft: `3px solid ${cfg.border}`,
          borderRadius: "0 8px 8px 0",
          padding: "12px 14px",
          marginBottom: 10,
          transition: "transform 0.15s",
          cursor: article.url !== "#" ? "pointer" : "default",
        }}
        onMouseEnter={(e) => { if (article.url !== "#") e.currentTarget.style.transform = "translateX(3px)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: cfg.textColor, fontFamily: "'Syne', sans-serif", fontWeight: 700, letterSpacing: "0.05em" }}>
            {cfg.label}
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "#475569" }}>{article.source}</span>
            <span style={{ fontSize: 10, color: "#334155" }}>•</span>
            <span style={{ fontSize: 10, color: "#475569" }}>{timeAgo(article.publishedAt)}</span>
          </div>
        </div>
        <p style={{ color: cfg.textBody, fontSize: 13, lineHeight: 1.55, fontFamily: "'Syne', sans-serif" }}>
          {article.title}
        </p>
        {article.isMock && (
          <span style={{ fontSize: 9, color: "#334155", marginTop: 4, display: "block" }}>* Simulated news (add NewsAPI key for real news)</span>
        )}
      </div>
    </a>
  );
}

export function NewsFeed({ news, loading, symbol }) {
  if (loading) return (
    <div style={{ padding: 20, textAlign: "center", color: "#475569" }}>
      <div style={{ width: 24, height: 24, border: "2px solid #1e293b", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 8px" }} />
      Loading news...
    </div>
  );

  if (!news || !news.length) return (
    <div style={{ padding: 20, textAlign: "center", color: "#475569" }}>No news available for {symbol}</div>
  );

  const positive = news.filter((n) => n.sentiment?.label === "Positive");
  const negative = news.filter((n) => n.sentiment?.label === "Negative");
  const neutral = news.filter((n) => n.sentiment?.label === "Neutral");

  const score = positive.length / (news.length || 1);

  return (
    <div>
      {/* Sentiment Summary Bar */}
      <div style={{ marginBottom: 16, padding: "10px 14px", background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: "#64748b", fontSize: 11, fontFamily: "'Syne'" }}>NEWS SENTIMENT ({news.length} articles)</span>
          <div style={{ display: "flex", gap: 12 }}>
            <span style={{ color: "#4ade80", fontSize: 11 }}>▲ {positive.length}</span>
            <span style={{ color: "#94a3b8", fontSize: 11 }}>● {neutral.length}</span>
            <span style={{ color: "#f87171", fontSize: 11 }}>▼ {negative.length}</span>
          </div>
        </div>
        <div style={{ display: "flex", height: 6, borderRadius: 4, overflow: "hidden", gap: 2 }}>
          <div style={{ flex: positive.length, background: "#22c55e", borderRadius: "4px 0 0 4px" }} />
          <div style={{ flex: neutral.length, background: "#475569" }} />
          <div style={{ flex: negative.length, background: "#ef4444", borderRadius: "0 4px 4px 0" }} />
        </div>
        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>Overall:</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: score > 0.6 ? "#22c55e" : score < 0.4 ? "#ef4444" : "#f59e0b", fontFamily: "'Syne'" }}>
            {score > 0.6 ? "Bullish Sentiment" : score < 0.4 ? "Bearish Sentiment" : "Mixed Sentiment"}
          </span>
        </div>
      </div>

      {/* News cards */}
      {news.map((article) => <NewsCard key={article.id || article.url} article={article} />)}
    </div>
  );
}
