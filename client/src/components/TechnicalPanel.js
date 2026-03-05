import React from "react";
import { formatCurrency } from "../utils/format";

const SIGNAL_CONFIG = {
  Bullish:    { color: "#22c55e", bg: "rgba(34,197,94,0.12)",   label: "BULLISH" },
  Bearish:    { color: "#ef4444", bg: "rgba(239,68,68,0.12)",   label: "BEARISH" },
  Oversold:   { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  label: "OVERSOLD" },
  Overbought: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  label: "OVERBOUGHT" },
  Neutral:    { color: "#64748b", bg: "rgba(100,116,139,0.1)",  label: "NEUTRAL" },
  BUY:        { color: "#22c55e", bg: "rgba(34,197,94,0.15)",   label: "BUY" },
  SELL:       { color: "#ef4444", bg: "rgba(239,68,68,0.15)",   label: "SELL" },
  HOLD:       { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",   label: "HOLD" },
};

export function TechnicalPanel({ technicals, quote, region }) {
  if (!technicals || Object.keys(technicals).length === 0) {
    return <div style={{ color: "#475569", padding: 20, textAlign: "center" }}>Loading technicals...</div>;
  }

  const { signals = [], overallSignal, rsi, macd, sma20, sma50, sma200, bbUpper, bbLower, atr, vwap, bullCount, bearCount } = technicals;
  const overallCfg = SIGNAL_CONFIG[overallSignal] || SIGNAL_CONFIG.HOLD;
  const cur = quote?.currency;

  const indicators = [
    { label: "RSI (14)", value: rsi?.toFixed(1), info: rsi < 30 ? "Oversold zone" : rsi > 70 ? "Overbought zone" : "Neutral range", signal: rsi < 30 ? "Oversold" : rsi > 70 ? "Overbought" : "Neutral" },
    { label: "MACD", value: macd?.toFixed(2), info: macd > 0 ? "Above zero line" : "Below zero line", signal: macd > 0 ? "Bullish" : "Bearish" },
    { label: "SMA 20", value: formatCurrency(sma20, cur, region), info: quote?.price > sma20 ? "Price above SMA20" : "Price below SMA20", signal: quote?.price > sma20 ? "Bullish" : "Bearish" },
    { label: "SMA 50", value: formatCurrency(sma50, cur, region), info: quote?.price > sma50 ? "Price above SMA50" : "Price below SMA50", signal: quote?.price > sma50 ? "Bullish" : "Bearish" },
    { label: "SMA 200", value: formatCurrency(sma200, cur, region), info: quote?.price > sma200 ? "Price above SMA200 (uptrend)" : "Price below SMA200 (downtrend)", signal: quote?.price > sma200 ? "Bullish" : "Bearish" },
    { label: "BB Upper", value: formatCurrency(bbUpper, cur, region), info: quote?.price > bbUpper ? "Price above upper band" : "Below upper band", signal: quote?.price > bbUpper ? "Overbought" : "Neutral" },
    { label: "BB Lower", value: formatCurrency(bbLower, cur, region), info: quote?.price < bbLower ? "Price below lower band" : "Above lower band", signal: quote?.price < bbLower ? "Oversold" : "Neutral" },
    { label: "ATR (14)", value: atr?.toFixed(2), info: "Average True Range (volatility)", signal: "Neutral" },
    { label: "VWAP", value: formatCurrency(vwap, cur, region), info: quote?.price > vwap ? "Price above VWAP (bullish)" : "Price below VWAP (bearish)", signal: quote?.price > vwap ? "Bullish" : "Bearish" },
  ].filter((i) => i.value && i.value !== "—");

  return (
    <div>
      {/* Overall Signal */}
      <div style={{ background: overallCfg.bg, border: `1px solid ${overallCfg.color}40`, borderRadius: 10, padding: "14px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "#64748b", fontSize: 10, fontFamily: "'Syne'", letterSpacing: "0.12em" }}>OVERALL SIGNAL</div>
          <div style={{ color: overallCfg.color, fontFamily: "'Syne'", fontWeight: 800, fontSize: 22, marginTop: 2 }}>{overallSignal}</div>
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ color: "#22c55e", fontSize: 12 }}>▲ {bullCount} Bullish</span>
          <span style={{ color: "#ef4444", fontSize: 12 }}>▼ {bearCount} Bearish</span>
        </div>
      </div>

      {/* Signal breakdown from calc */}
      {signals.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: "#475569", fontSize: 10, fontFamily: "'Syne'", letterSpacing: "0.1em", marginBottom: 8 }}>SIGNAL BREAKDOWN</div>
          {signals.map((s, i) => {
            const cfg = SIGNAL_CONFIG[s.signal] || SIGNAL_CONFIG.Neutral;
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#080f1e", borderRadius: 7, marginBottom: 6 }}>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>{s.name}</div>
                  <div style={{ color: "#475569", fontSize: 10 }}>{s.detail}</div>
                </div>
                <span style={{ background: cfg.bg, color: cfg.color, padding: "3px 10px", borderRadius: 5, fontSize: 11, fontFamily: "'Syne'", fontWeight: 700 }}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Indicator values */}
      <div style={{ color: "#475569", fontSize: 10, fontFamily: "'Syne'", letterSpacing: "0.1em", marginBottom: 8 }}>INDICATOR VALUES</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {indicators.map((ind) => {
          const cfg = SIGNAL_CONFIG[ind.signal] || SIGNAL_CONFIG.Neutral;
          return (
            <div key={ind.label} style={{ background: "#080f1e", borderRadius: 7, padding: "9px 12px", borderLeft: `2px solid ${cfg.color}` }}>
              <div style={{ color: "#475569", fontSize: 10 }}>{ind.label}</div>
              <div style={{ color: "#e2e8f0", fontFamily: "'JetBrains Mono'", fontSize: 13, marginTop: 2 }}>{ind.value}</div>
              <div style={{ color: "#334155", fontSize: 9, marginTop: 2 }}>{ind.info}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RSIBadge({ value }) {
  if (value == null) return null;
  const color = value < 30 ? "#ef4444" : value > 70 ? "#22c55e" : "#94a3b8";
  const label = value < 30 ? "OS" : value > 70 ? "OB" : "";
  return (
    <span style={{ color, fontFamily: "'JetBrains Mono'", fontSize: 12 }}>
      {value.toFixed(1)}
      {label && <span style={{ fontSize: 9, marginLeft: 3, opacity: 0.7 }}>{label}</span>}
    </span>
  );
}

export function SentimentBadge({ value }) {
  const cfg = value === "Bullish" ? { bg: "rgba(34,197,94,0.15)", color: "#4ade80" } : { bg: "rgba(239,68,68,0.15)", color: "#f87171" };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontFamily: "'Syne'", fontWeight: 600 }}>
      {value === "Bullish" ? "▲" : "▼"} {value}
    </span>
  );
}

export function SignalBadge({ signal }) {
  const cfg = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG.Neutral;
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontFamily: "'Syne'", fontWeight: 700 }}>
      {cfg.label}
    </span>
  );
}
