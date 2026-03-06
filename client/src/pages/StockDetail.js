// pages/StockDetail.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchSummary, fetchHistory, fetchNews,
  addToWatchlist, removeFromWatchlist,
  selectSummary, selectHistory, selectNews, selectQuotes,
  selectIsWatched, selectAuth,
} from "../store";
import { formatPrice, formatPercent, formatNumber, formatMarketCap, changeColor } from "../utils/format";

const C = {
  orange:"#f97316",bg:"#080f1e",surface:"#0d1b2e",card:"#0f1f35",
  border:"#1e3a5f",text:"#e2e8f0",muted:"#64748b",green:"#22c55e",red:"#ef4444",
};

const PERIODS = [
  {key:"1wk",label:"1W"},{key:"1mo",label:"1M"},{key:"3mo",label:"3M"},
  {key:"6mo",label:"6M"},{key:"1y",label:"1Y"},{key:"2y",label:"2Y"},
];
const TABS = [
  {key:"chart",label:"📈 Chart"},{key:"technicals",label:"⚙️ Technicals"},
  {key:"fundamentals",label:"📊 Fundamentals"},{key:"news",label:"📰 News"},
];

export default function StockDetail() {
  const { symbol }  = useParams();
  const decoded     = decodeURIComponent(symbol);
  const navigate    = useNavigate();
  const dispatch    = useDispatch();

  const [tab,    setTab]    = useState("chart");
  const [period, setPeriod] = useState("3mo");

  const summary   = useSelector(selectSummary(decoded));
  const history   = useSelector(selectHistory(decoded, period));
  const news      = useSelector(selectNews(decoded));
  const quotes    = useSelector(selectQuotes);
  const isWatched = useSelector(selectIsWatched(decoded));
  const { user }  = useSelector(selectAuth);

  const quote = summary?.quote || quotes[decoded] || {};
  const tech  = summary?.technicals || {};
  const fund  = summary?.fundamentals || {};

  useEffect(() => {
    dispatch(fetchSummary(decoded));
    dispatch(fetchHistory({ symbol: decoded, period }));
  }, [decoded]);

  useEffect(() => {
    dispatch(fetchHistory({ symbol: decoded, period }));
  }, [period]);

  useEffect(() => {
    if (tab === "news" && !news) dispatch(fetchNews(decoded));
  }, [tab]);

  const toggleWatch = () => {
    if (!user) { navigate("/auth"); return; }
    if (isWatched) dispatch(removeFromWatchlist(decoded));
    else dispatch(addToWatchlist({ symbol: decoded, name: quote.name, sector: quote.sector }));
  };

  const sym = decoded.replace(".NS","");
  const loading = !summary;

  return (
    <div style={{ minHeight:"100vh",background:C.bg,color:C.text,paddingBottom:48 }}>
      <div style={{ padding:"12px 24px 0" }}>
        <button onClick={() => navigate(-1)} style={S.back}>← Back</button>
      </div>

      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
            <h1 style={S.symbol}>{sym}</h1>
            <span style={S.badge("#f97316","rgba(249,115,22,0.15)")}>NSE</span>
            {quote.sector && <span style={S.badge("#a5b4fc","rgba(99,102,241,0.12)")}>{quote.sector}</span>}
            <span style={S.badge("#4ade80","rgba(34,197,94,0.12)")}>● INDIA</span>
          </div>
          <p style={{ color:C.muted,marginTop:4,fontSize:15 }}>{quote.name || decoded}</p>
        </div>
        <div style={{ display:"flex",alignItems:"flex-start",gap:16,flexWrap:"wrap" }}>
          <div style={{ textAlign:"right" }}>
            {loading
              ? <div style={{ color:C.muted }}>Loading…</div>
              : <>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:32,color:C.text }}>
                    {formatPrice(quote.price)}
                  </div>
                  <div style={{ color:changeColor(quote.changePercent),fontFamily:"monospace",fontSize:18 }}>
                    {formatPercent(quote.changePercent)}
                    <span style={{ fontSize:12,marginLeft:8,color:C.muted }}>
                      ({quote.change >= 0 ? "+" : ""}{quote.change?.toFixed(2)})
                    </span>
                  </div>
                </>
            }
          </div>
          <button onClick={toggleWatch} style={{
            padding:"8px 16px",borderRadius:8,border:`1px solid ${isWatched?"#22c55e":"rgba(249,115,22,0.4)"}`,
            background:isWatched?"rgba(34,197,94,0.1)":"rgba(249,115,22,0.08)",
            color:isWatched?"#22c55e":C.orange,cursor:"pointer",fontWeight:600,fontSize:13,
          }}>
            {isWatched ? "✓ Watching" : "⭐ Watch"}
          </button>
        </div>
      </div>

      {/* Key metrics strip */}
      <div style={{ display:"flex",flexWrap:"wrap",gap:4,padding:"10px 24px",background:"#0a1628",borderBottom:`1px solid #1e293b` }}>
        {[
          {label:"Open",      value:formatPrice(quote.open)},
          {label:"High",      value:formatPrice(quote.high)},
          {label:"Low",       value:formatPrice(quote.low)},
          {label:"Prev Close",value:formatPrice(quote.prevClose)},
          {label:"Volume",    value:formatNumber(quote.volume)},
          {label:"Avg Vol",   value:formatNumber(quote.avgVolume)},
          {label:"Mkt Cap",   value:formatMarketCap(quote.marketCap)},
          {label:"P/E",       value:quote.peRatio?.toFixed(1)||"—"},
          {label:"EPS",       value:quote.eps?`₹${quote.eps.toFixed(2)}`:"—"},
          {label:"Div Yield", value:quote.divYield?`${quote.divYield.toFixed(2)}%`:"—"},
          {label:"52W High",  value:formatPrice(quote.high52)},
          {label:"52W Low",   value:formatPrice(quote.low52)},
          {label:"Beta",      value:quote.beta?.toFixed(2)||"—"},
        ].map(m => (
          <div key={m.label} style={S.metric}>
            <div style={{ fontSize:10,color:C.muted,fontWeight:600,letterSpacing:"0.06em" }}>{m.label}</div>
            <div style={{ fontSize:13,color:C.text,fontFamily:"'JetBrains Mono',monospace",marginTop:2 }}>{m.value||"—"}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ padding:"16px 24px 0",display:"flex",gap:4 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding:"8px 16px",borderRadius:8,border:`1px solid ${tab===t.key?C.orange:C.border}`,
            background:tab===t.key?"rgba(249,115,22,0.1)":"transparent",
            color:tab===t.key?C.orange:C.muted,cursor:"pointer",fontSize:13,fontWeight:500,
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding:"16px 24px" }}>
        {/* CHART */}
        {tab === "chart" && (
          <div style={S.card}>
            <div style={{ display:"flex",gap:6,marginBottom:16 }}>
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)} style={{
                  padding:"5px 12px",borderRadius:6,border:`1px solid ${period===p.key?C.orange:C.border}`,
                  background:period===p.key?"rgba(249,115,22,0.1)":"transparent",
                  color:period===p.key?C.orange:C.muted,cursor:"pointer",fontSize:12,
                }}>{p.label}</button>
              ))}
            </div>
            {history && history.length > 0
              ? <MiniLineChart data={history} />
              : <div style={{ height:280,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted }}>
                  {loading ? "Loading chart…" : "No chart data available"}
                </div>
            }
          </div>
        )}

        {/* TECHNICALS */}
        {tab === "technicals" && <TechPanel tech={tech} quote={quote} />}

        {/* FUNDAMENTALS */}
        {tab === "fundamentals" && <FundPanel fund={fund} quote={quote} />}

        {/* NEWS */}
        {tab === "news" && <NewsPanel news={news} symbol={decoded} name={quote.name} />}
      </div>
    </div>
  );
}

// ─── Mini chart ───────────────────────────────────────────────────────────────
function MiniLineChart({ data }) {
  if (!data || data.length < 2) return null;
  const closes = data.map(d => d.close);
  const mn = Math.min(...closes), mx = Math.max(...closes);
  const range = mx - mn || 1;
  const W = 900, H = 260, pad = 40;
  const x = (i) => pad + (i / (closes.length - 1)) * (W - pad*2);
  const y = (v) => H - pad - ((v - mn) / range) * (H - pad*2);
  const pts = closes.map((v,i) => `${x(i)},${y(v)}`).join(" ");
  const first = closes[0], last = closes[closes.length-1];
  const up = last >= first;
  const color = up ? "#22c55e" : "#ef4444";
  const fill  = up ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)";
  const areaClose = `${x(closes.length-1)},${H-pad} ${x(0)},${H-pad}`;

  // X-axis labels (5 evenly spaced)
  const xLabels = [0,1,2,3,4].map(i => {
    const idx = Math.round(i * (data.length - 1) / 4);
    return { x: x(idx), label: data[idx]?.date?.slice(5) || "" };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%",height:"auto" }}>
      <polygon points={`${pts} ${areaClose}`} fill={fill} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {xLabels.map((l,i) => (
        <text key={i} x={l.x} y={H-8} textAnchor="middle" fontSize="11" fill="#475569">{l.label}</text>
      ))}
      {/* Current price label */}
      <text x={x(closes.length-1)+4} y={y(last)} fontSize="11" fill={color} dominantBaseline="middle">
        ₹{last.toLocaleString("en-IN",{maximumFractionDigits:2})}
      </text>
    </svg>
  );
}

// ─── Technicals ───────────────────────────────────────────────────────────────
function TechPanel({ tech, quote }) {
  if (!tech || Object.keys(tech).length === 0)
    return <div style={S.card}><p style={{ color:C.muted,textAlign:"center",padding:30 }}>Loading technicals…</p></div>;

  const cur = quote.price;
  return (
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14 }}>
      {/* Overall signal */}
      <div style={{ ...S.card, gridColumn:"1/-1", display:"flex", alignItems:"center", gap:20 }}>
        <div style={{
          padding:"12px 24px", borderRadius:10, fontSize:22, fontWeight:800, fontFamily:"'Syne',sans-serif",
          background: tech.overallSignal==="BUY"?"rgba(34,197,94,0.15)":tech.overallSignal==="SELL"?"rgba(239,68,68,0.15)":"rgba(99,102,241,0.15)",
          color: tech.overallSignal==="BUY"?"#22c55e":tech.overallSignal==="SELL"?"#ef4444":"#a5b4fc",
          border:`1px solid ${tech.overallSignal==="BUY"?"rgba(34,197,94,0.3)":tech.overallSignal==="SELL"?"rgba(239,68,68,0.3)":"rgba(99,102,241,0.3)"}`,
        }}>{tech.overallSignal}</div>
        <div>
          <div style={{ fontSize:14,color:C.text }}>Overall Signal · {tech.bullCount} bullish, {tech.bearCount} bearish indicators</div>
          <div style={{ fontSize:12,color:C.muted,marginTop:4 }}>RSI: {tech.rsi} · MACD: {tech.macd} · ATR: {tech.atr}</div>
        </div>
      </div>

      {/* Moving averages */}
      <div style={S.card}>
        <div style={S.cardTitle}>Moving Averages</div>
        {[
          {label:"SMA 20",  value:tech.sma20,  vs:cur},
          {label:"SMA 50",  value:tech.sma50,  vs:cur},
          {label:"SMA 200", value:tech.sma200, vs:cur},
          {label:"EMA 12",  value:tech.ema12,  vs:cur},
          {label:"EMA 26",  value:tech.ema26,  vs:cur},
        ].map(r => r.value && (
          <div key={r.label} style={S.row}>
            <span style={{ color:C.muted,fontSize:12 }}>{r.label}</span>
            <span style={{ fontFamily:"monospace",fontSize:12,color:r.vs>r.value?"#22c55e":"#ef4444" }}>
              ₹{r.value?.toLocaleString("en-IN",{maximumFractionDigits:2})}
            </span>
          </div>
        ))}
      </div>

      {/* Oscillators */}
      <div style={S.card}>
        <div style={S.cardTitle}>Oscillators</div>
        <div style={S.row}>
          <span style={{ color:C.muted,fontSize:12 }}>RSI (14)</span>
          <span style={{ fontSize:12,fontFamily:"monospace",
            color:tech.rsi<30?"#22c55e":tech.rsi>70?"#ef4444":C.text }}>
            {tech.rsi} {tech.rsi<30?"(Oversold)":tech.rsi>70?"(Overbought)":"(Neutral)"}
          </span>
        </div>
        <div style={S.row}><span style={{ color:C.muted,fontSize:12 }}>MACD</span><span style={{ fontFamily:"monospace",fontSize:12,color:tech.macd>0?"#22c55e":"#ef4444" }}>{tech.macd}</span></div>
        <div style={S.row}><span style={{ color:C.muted,fontSize:12 }}>BB Upper</span><span style={{ fontFamily:"monospace",fontSize:12,color:C.text }}>₹{tech.bbUpper?.toLocaleString("en-IN",{maximumFractionDigits:2})}</span></div>
        <div style={S.row}><span style={{ color:C.muted,fontSize:12 }}>BB Middle</span><span style={{ fontFamily:"monospace",fontSize:12,color:C.text }}>₹{tech.bbMiddle?.toLocaleString("en-IN",{maximumFractionDigits:2})}</span></div>
        <div style={S.row}><span style={{ color:C.muted,fontSize:12 }}>BB Lower</span><span style={{ fontFamily:"monospace",fontSize:12,color:C.text }}>₹{tech.bbLower?.toLocaleString("en-IN",{maximumFractionDigits:2})}</span></div>
        <div style={S.row}><span style={{ color:C.muted,fontSize:12 }}>ATR (14)</span><span style={{ fontFamily:"monospace",fontSize:12,color:C.text }}>₹{tech.atr}</span></div>
      </div>

      {/* Signals */}
      <div style={S.card}>
        <div style={S.cardTitle}>Signal Summary</div>
        {(tech.signals||[]).map((sig,i) => (
          <div key={i} style={S.row}>
            <span style={{ color:C.muted,fontSize:12 }}>{sig.name}</span>
            <span style={{
              fontSize:11,padding:"2px 8px",borderRadius:99,fontWeight:600,
              background:sig.signal==="Bullish"||sig.signal==="Oversold"?"rgba(34,197,94,0.15)":sig.signal==="Neutral"?"rgba(99,102,241,0.1)":"rgba(239,68,68,0.15)",
              color:sig.signal==="Bullish"||sig.signal==="Oversold"?"#22c55e":sig.signal==="Neutral"?"#a5b4fc":"#ef4444",
            }}>{sig.signal}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Fundamentals — FIXED ────────────────────────────────────────────────────
function FundPanel({ fund, quote }) {
  const has = (v) => v != null;
  const pct = (v) => has(v) ? `${(v * 100).toFixed(2)}%` : "—";
  const num = (v, dec=2) => has(v) ? Number(v).toFixed(dec) : "—";
  const inr = (v) => has(v) ? formatMarketCap(v) : "—";
  const crore = (v) => has(v) ? `₹${(v/1e7).toFixed(0)} Cr` : "—";

  const sections = [
    {
      title:"📊 Valuation",
      items:[
        {label:"P/E Ratio (TTM)",   value:num(quote.peRatio,1)},
        {label:"P/B Ratio",         value:num(fund.pbRatio,2)},
        {label:"PEG Ratio",         value:num(fund.pegRatio,2)},
        {label:"EPS (TTM)",         value:has(quote.eps)?`₹${num(quote.eps,2)}`:"—"},
        {label:"Dividend Yield",    value:has(quote.divYield)?`${num(quote.divYield,2)}%`:"—"},
        {label:"Beta",              value:num(quote.beta,2)},
      ],
    },
    {
      title:"💰 Profitability",
      items:[
        {label:"Return on Equity",  value:pct(fund.returnOnEquity)},
        {label:"Return on Assets",  value:pct(fund.returnOnAssets)},
        {label:"Gross Margin",      value:pct(fund.grossMargins)},
        {label:"Operating Margin",  value:pct(fund.operatingMargins)},
        {label:"Net Profit Margin", value:pct(fund.profitMargins)},
        {label:"EBITDA",            value:crore(fund.ebitda)},
      ],
    },
    {
      title:"📈 Growth",
      items:[
        {label:"Revenue Growth (YoY)", value:pct(fund.revenueGrowth)},
        {label:"Earnings Growth (YoY)",value:pct(fund.earningsGrowth)},
        {label:"Total Revenue",        value:crore(fund.totalRevenue)},
        {label:"Free Cash Flow",       value:crore(fund.freeCashflow)},
        {label:"52W High",             value:formatPrice(quote.high52)},
        {label:"52W Low",              value:formatPrice(quote.low52)},
      ],
    },
    {
      title:"🏦 Balance Sheet",
      items:[
        {label:"Debt / Equity",     value:num(fund.debtToEquity,2)},
        {label:"Current Ratio",     value:num(fund.currentRatio,2)},
        {label:"Quick Ratio",       value:num(fund.quickRatio,2)},
        {label:"Market Cap",        value:inr(quote.marketCap)},
        {label:"50-Day Avg",        value:formatPrice(fund.fiftyDayAvg)},
        {label:"200-Day Avg",       value:formatPrice(fund.twoHundredDayAvg)},
      ],
    },
  ];

  const allEmpty = sections.every(s => s.items.every(i => i.value === "—"));

  return (
    <div>
      {allEmpty && (
        <div style={{ background:"rgba(249,115,22,0.08)",border:"1px solid rgba(249,115,22,0.2)",borderRadius:10,padding:"12px 16px",marginBottom:16,fontSize:13,color:C.orange }}>
          ⚠ Some fundamental data may be unavailable for this stock. This is normal for smaller companies or ETFs.
        </div>
      )}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14 }}>
        {sections.map(sec => (
          <div key={sec.title} style={S.card}>
            <div style={{ ...S.cardTitle,marginBottom:14,paddingBottom:10,borderBottom:`1px solid ${C.border}` }}>{sec.title}</div>
            {sec.items.map(item => (
              <div key={item.label} style={S.row}>
                <span style={{ color:C.muted,fontSize:12 }}>{item.label}</span>
                <span style={{ color:item.value==="—"?"#334155":C.text,fontFamily:"'JetBrains Mono',monospace",fontSize:12 }}>{item.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── News — clickable, thumbnail, real URLs ───────────────────────────────────
function NewsPanel({ news, symbol, name }) {
  if (!news) return (
    <div style={S.card}>
      <p style={{ color:C.muted,textAlign:"center",padding:30 }}>Loading news…</p>
    </div>
  );

  const sentColor = (l) => l==="Positive"?"#22c55e":l==="Negative"?"#ef4444":"#a5b4fc";
  const timeAgo = (d) => {
    if (!d) return "";
    const mins = Math.floor((Date.now() - new Date(d)) / 60000);
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
    return `${Math.floor(mins/1440)}d ago`;
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
      <div style={{ fontSize:13,color:C.muted,marginBottom:4 }}>{news.length} articles · click to read</div>
      {news.map(article => (
        <a
          key={article.id}
          href={article.url !== "#" ? article.url : undefined}
          target="_blank"
          rel="noopener noreferrer"
          onClick={article.url === "#" ? (e) => e.preventDefault() : undefined}
          style={{
            display:"block",textDecoration:"none",
            background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:16,
            transition:"all 0.15s",cursor:article.url!=="#"?"pointer":"default",
          }}
          onMouseEnter={e => { if(article.url!=="&") { e.currentTarget.style.borderColor=C.orange; e.currentTarget.style.background=C.card; }}}
          onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.surface; }}
        >
          <div style={{ display:"flex",gap:14,alignItems:"flex-start" }}>
            {/* Thumbnail */}
            {article.urlToImage && (
              <img src={article.urlToImage} alt="" style={{ width:80,height:60,objectFit:"cover",borderRadius:6,flexShrink:0 }} onError={e=>e.target.style.display="none"}/>
            )}
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap" }}>
                <span style={{ fontSize:11,color:C.muted,fontWeight:600 }}>{article.source}</span>
                <span style={{ fontSize:10,color:"#334155" }}>·</span>
                <span style={{ fontSize:11,color:"#334155" }}>{timeAgo(article.publishedAt)}</span>
                {article.isMock && <span style={{ fontSize:10,padding:"1px 6px",borderRadius:99,background:"rgba(99,102,241,0.1)",color:"#a5b4fc" }}>SAMPLE</span>}
                <span style={{
                  fontSize:10,padding:"1px 7px",borderRadius:99,fontWeight:600,marginLeft:"auto",
                  background:`${sentColor(article.sentiment?.label)}15`,
                  color:sentColor(article.sentiment?.label),
                }}>{article.sentiment?.label}</span>
              </div>
              <div style={{ fontSize:14,color:C.text,fontWeight:500,lineHeight:1.4,marginBottom:6 }}>{article.title}</div>
              {article.description && article.description !== article.title && (
                <div style={{ fontSize:12,color:C.muted,lineHeight:1.5,
                  overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" }}>
                  {article.description}
                </div>
              )}
              {article.url && article.url !== "#" && (
                <div style={{ fontSize:11,color:C.orange,marginTop:6,display:"flex",alignItems:"center",gap:4 }}>
                  Read full article ↗
                </div>
              )}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

const S = {
  back:     { background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"6px 14px",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontSize:13 },
  header:   { padding:"16px 24px 14px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16,borderBottom:`1px solid ${C.border}` },
  symbol:   { fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:30,color:C.text,margin:0 },
  badge:    (color,bg) => ({ background:bg,color:color,padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:700 }),
  metric:   { background:C.surface,padding:"8px 14px",borderRadius:7,minWidth:100,margin:"3px" },
  card:     { background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20,marginBottom:16 },
  cardTitle:{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:C.text,marginBottom:12 },
  row:      { display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid rgba(30,41,59,0.4)` },
};

