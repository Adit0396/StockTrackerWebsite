import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToWatchlist, removeFromWatchlist, selectIsWatched, selectAuth } from "../store";
import api from "../utils/api";
import { formatPrice, formatMarketCap, formatPercent, changeColor } from "../utils/format";

const C = {
  orange:"#f97316",bg:"#080f1e",surface:"#0d1b2e",card:"#0f1f35",
  border:"#1e3a5f",text:"#e2e8f0",muted:"#64748b",green:"#22c55e",red:"#ef4444",
};

const SORT_COLS = [
  { key:"changePercent", label:"% Change" },
  { key:"price",         label:"Price"    },
  { key:"marketCap",     label:"Mkt Cap"  },
  { key:"volume",        label:"Volume"   },
  { key:"peRatio",       label:"P/E"      },
];

function useDebounce(v, d) {
  const [dv, setDv] = useState(v);
  useEffect(() => { const t = setTimeout(() => setDv(v), d); return () => clearTimeout(t); }, [v, d]);
  return dv;
}

export default function Screener() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { user }  = useSelector(selectAuth);

  // Sector list from backend
  const [sectors,     setSectors]     = useState([]);

  // Universe browse mode
  const [sector,      setSector]      = useState("All");
  const [page,        setPage]        = useState(1);
  const [pageData,    setPageData]    = useState({ stocks:[], total:0, pages:1 });
  const [browsing,    setBrowsing]    = useState(false);

  // Search mode
  const [searchInput, setSearchInput] = useState("");
  const [searchResults,setSearchResults] = useState([]);
  const [searching,   setSearching]   = useState(false);

  // Quotes cache for displayed stocks
  const [quotes,      setQuotes]      = useState({});
  const [fetchingQ,   setFetchingQ]   = useState(false);

  // Filters
  const [sortCol,  setSortCol]  = useState("changePercent");
  const [sortAsc,  setSortAsc]  = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minPE,    setMinPE]    = useState("");
  const [maxPE,    setMaxPE]    = useState("");

  const debouncedSearch = useDebounce(searchInput, 300);
  const PAGE_SIZE = 50;

  // Load sectors on mount
  useEffect(() => {
    api.getUniverseSectors().then(data => {
      setSectors([{ sector:"All", count: data.reduce((a,b)=>a+b.count,0) }, ...data]);
    }).catch(() => {});
  }, []);

  // Load universe page when sector/page changes (not in search mode)
  useEffect(() => {
    if (debouncedSearch.trim()) return; // search takes priority
    setBrowsing(true);
    api.getUniverse(sector, page, PAGE_SIZE)
      .then(data => {
        setPageData(data);
        // Fetch quotes for stocks without cached quotes
        const uncached = data.stocks.filter(s => !quotes[s.symbol] && !s.price).map(s => s.symbol);
        if (uncached.length > 0) fetchQuotes(uncached);
      })
      .catch(() => {})
      .finally(() => setBrowsing(false));
  }, [sector, page, debouncedSearch]);

  // Search mode
  useEffect(() => {
    if (!debouncedSearch.trim()) { setSearchResults([]); return; }
    setSearching(true);
    api.search(debouncedSearch, 50)
      .then(async results => {
        setSearchResults(results);
        const uncached = results.filter(s => !quotes[s.symbol] && !s.price).map(s => s.symbol);
        if (uncached.length > 0) fetchQuotes(uncached);
      })
      .catch(() => {})
      .finally(() => setSearching(false));
  }, [debouncedSearch]);

  const fetchQuotes = useCallback(async (symbols) => {
    if (!symbols.length) return;
    setFetchingQ(true);
    try {
      const data = await api.screenerQuotes(symbols);
      setQuotes(q => ({ ...q, ...data }));
    } catch(e) { console.error(e); }
    finally { setFetchingQ(false); }
  }, []);

  const handleSectorChange = (sec) => {
    setSector(sec);
    setPage(1);
    setSearchInput("");
    setSearchResults([]);
  };

  const handleSort = (col) => {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(false); }
  };

  // Which list to display
  const isSearchMode = !!debouncedSearch.trim();
  const rawList = isSearchMode ? searchResults : pageData.stocks;

  // Merge with fresh quotes cache
  let stocks = rawList.map(s => ({ ...s, ...(quotes[s.symbol] || {}) }));

  // Client-side filters
  if (minPrice) stocks = stocks.filter(s => (s.price||0) >= Number(minPrice));
  if (maxPrice) stocks = stocks.filter(s => (s.price||0) <= Number(maxPrice));
  if (minPE)    stocks = stocks.filter(s => (s.peRatio||0) >= Number(minPE));
  if (maxPE)    stocks = stocks.filter(s => (s.peRatio||0) <= Number(maxPE));

  // Sort (only in search mode or when we have data — server already paginates universe)
  if (isSearchMode || sortCol !== "changePercent") {
    stocks = [...stocks].sort((a, b) => {
      const av = a[sortCol] ?? (sortAsc ? Infinity : -Infinity);
      const bv = b[sortCol] ?? (sortAsc ? Infinity : -Infinity);
      return sortAsc ? av - bv : bv - av;
    });
  }

  const isLoading = browsing || searching;
  const totalCount = isSearchMode ? searchResults.length : pageData.total;

  return (
    <div style={{ minHeight:"100vh",background:C.bg,padding:"24px" }}>
      <div style={{ maxWidth:1300,margin:"0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:C.text,marginBottom:4 }}>
            🔎 Stock Screener
          </h1>
          <p style={{ color:C.muted,fontSize:13 }}>
            {sectors[0]?.count ? `${sectors[0].count.toLocaleString()}` : "2,600+"} NSE-listed companies across all sectors
          </p>
        </div>

        {/* Search bar */}
        <div style={{
          display:"flex",alignItems:"center",gap:8,marginBottom:16,
          background:C.surface,border:`1px solid ${isSearchMode ? C.orange : C.border}`,
          borderRadius:10,padding:"0 14px",height:44,transition:"border-color 0.2s",
        }}>
          <span style={{ color:C.muted,fontSize:14 }}>{searching ? "⏳" : "🔍"}</span>
          <input
            value={searchInput}
            onChange={e => { setSearchInput(e.target.value); setPage(1); }}
            placeholder="Search any NSE stock — symbol or company name…"
            style={{ flex:1,background:"transparent",border:"none",outline:"none",color:C.text,fontSize:14,fontFamily:"inherit" }}
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(""); setSearchResults([]); }}
              style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14 }}>✕</button>
          )}
        </div>

        {/* Filter row */}
        <div style={{ display:"flex",gap:10,flexWrap:"wrap",marginBottom:16,alignItems:"center" }}>
          <span style={{ fontSize:12,color:C.muted }}>Filter:</span>
          {[
            { placeholder:"Min ₹",  value:minPrice, set:setMinPrice },
            { placeholder:"Max ₹",  value:maxPrice, set:setMaxPrice },
            { placeholder:"Min P/E",value:minPE,    set:setMinPE    },
            { placeholder:"Max P/E",value:maxPE,    set:setMaxPE    },
          ].map(f => (
            <input key={f.placeholder} value={f.value} onChange={e => f.set(e.target.value)}
              placeholder={f.placeholder}
              style={{ width:90,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,
                padding:"0 10px",height:36,color:C.text,fontSize:12,fontFamily:"inherit",outline:"none" }}
            />
          ))}
          {(minPrice||maxPrice||minPE||maxPE) && (
            <button onClick={() => { setMinPrice(""); setMaxPrice(""); setMinPE(""); setMaxPE(""); }}
              style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:12 }}>
              Clear filters
            </button>
          )}
          {fetchingQ && <span style={{ fontSize:11,color:C.orange }}>⏳ Fetching prices…</span>}
        </div>

        {/* Sector tabs */}
        {!isSearchMode && (
          <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:16 }}>
            {sectors.map(({ sector: sec, count }) => (
              <button key={sec} onClick={() => handleSectorChange(sec)} style={{
                padding:"5px 12px",borderRadius:99,fontSize:12,fontWeight:500,cursor:"pointer",
                border:`1px solid ${sector===sec ? C.orange : C.border}`,
                background: sector===sec ? "rgba(249,115,22,0.15)" : "transparent",
                color: sector===sec ? C.orange : C.muted,
                transition:"all 0.15s",
              }}>
                {sec} <span style={{ opacity:0.5,fontSize:10 }}>({count?.toLocaleString()})</span>
              </button>
            ))}
          </div>
        )}

        {/* Stats + pagination info */}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8 }}>
          <span style={{ fontSize:12,color:C.muted }}>
            {isLoading ? "Loading…" : (
              isSearchMode
                ? `${stocks.length} results for "${debouncedSearch}"`
                : `${stocks.length} of ${totalCount.toLocaleString()} stocks${sector!=="All" ? ` in ${sector}` : ""}`
            )}
          </span>
          {/* Pagination — only in browse mode */}
          {!isSearchMode && pageData.pages > 1 && (
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p-1)}
                style={{ padding:"4px 12px",borderRadius:6,border:`1px solid ${C.border}`,
                  background:"transparent",color:page<=1?C.muted:C.text,cursor:page<=1?"not-allowed":"pointer",fontSize:13 }}>
                ← Prev
              </button>
              <span style={{ fontSize:12,color:C.muted }}>Page {page} of {pageData.pages}</span>
              <button
                disabled={page >= pageData.pages}
                onClick={() => setPage(p => p+1)}
                style={{ padding:"4px 12px",borderRadius:6,border:`1px solid ${C.border}`,
                  background:"transparent",color:page>=pageData.pages?C.muted:C.text,cursor:page>=pageData.pages?"not-allowed":"pointer",fontSize:13 }}>
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div style={{ background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${C.border}`,background:"rgba(0,0,0,0.2)" }}>
                  <th style={thStyle}>STOCK</th>
                  {SORT_COLS.map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key)} style={{
                      ...thStyle, textAlign:"right", cursor:"pointer",
                      color: sortCol===col.key ? C.orange : C.muted,
                    }}>
                      {col.label} {sortCol===col.key ? (sortAsc?"↑":"↓") : ""}
                    </th>
                  ))}
                  <th style={{ ...thStyle,textAlign:"center" }}>WATCH</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && stocks.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding:"60px",textAlign:"center",color:C.muted }}>
                    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:12 }}>
                      <div style={{ width:32,height:32,border:"3px solid #1e293b",borderTop:`3px solid ${C.orange}`,borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/>
                      Loading stocks…
                    </div>
                  </td></tr>
                ) : stocks.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding:"60px",textAlign:"center",color:C.muted }}>
                    {isSearchMode ? `No results for "${searchInput}"` : "No stocks found"}
                  </td></tr>
                ) : stocks.map((s, i) => (
                  <StockRow key={s.symbol} stock={s} i={i} total={stocks.length}
                    navigate={navigate} dispatch={dispatch} user={user} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom pagination */}
        {!isSearchMode && pageData.pages > 1 && (
          <div style={{ display:"flex",justifyContent:"center",alignItems:"center",gap:8,marginTop:16 }}>
            <button disabled={page<=1} onClick={()=>setPage(1)}
              style={pageBtn(page<=1)}>« First</button>
            <button disabled={page<=1} onClick={()=>setPage(p=>p-1)}
              style={pageBtn(page<=1)}>← Prev</button>
            {/* Page number pills */}
            {Array.from({length:Math.min(7,pageData.pages)},(_,idx)=>{
              const total=pageData.pages, half=3;
              let start=Math.max(1,Math.min(page-half,total-6));
              return start+idx;
            }).map(p=>(
              <button key={p} onClick={()=>setPage(p)} style={{
                padding:"4px 10px",borderRadius:6,fontSize:12,cursor:"pointer",
                border:`1px solid ${p===page?C.orange:C.border}`,
                background:p===page?"rgba(249,115,22,0.15)":"transparent",
                color:p===page?C.orange:C.muted,
              }}>{p}</button>
            ))}
            <button disabled={page>=pageData.pages} onClick={()=>setPage(p=>p+1)}
              style={pageBtn(page>=pageData.pages)}>Next →</button>
            <button disabled={page>=pageData.pages} onClick={()=>setPage(pageData.pages)}
              style={pageBtn(page>=pageData.pages)}>Last »</button>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Stock row ────────────────────────────────────────────────────────────────
function StockRow({ stock: s, i, total, navigate, dispatch, user }) {
  const isWatched = useSelector(selectIsWatched(s.symbol));
  const [localLoading, setLocalLoading] = useState(false);

  const toggleWatch = async (e) => {
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    setLocalLoading(true);
    try {
      if (isWatched) await dispatch(removeFromWatchlist(s.symbol));
      else await dispatch(addToWatchlist({ symbol: s.symbol, name: s.name, sector: s.sector }));
    } finally { setLocalLoading(false); }
  };

  const sym    = s.symbol?.replace(".NS","") || "";
  const chgPct = s.changePercent;
  const hasQ   = s.price != null;

  return (
    <tr onClick={() => navigate(`/stock/${encodeURIComponent(s.symbol)}`)}
      style={{
        borderBottom: i < total-1 ? `1px solid rgba(30,58,95,0.4)` : "none",
        cursor:"pointer", transition:"background 0.1s",
      }}
      onMouseEnter={e => e.currentTarget.style.background="rgba(249,115,22,0.04)"}
      onMouseLeave={e => e.currentTarget.style.background="transparent"}
    >
      {/* Stock name */}
      <td style={{ padding:"11px 16px" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{
            padding:"3px 8px",borderRadius:5,minWidth:70,textAlign:"center",
            background:"rgba(249,115,22,0.1)",border:"1px solid rgba(249,115,22,0.2)",
            fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:700,color:"#f97316",
          }}>{sym}</div>
          <div>
            <div style={{ fontSize:13,color:"#e2e8f0",fontWeight:500 }}>{s.name}</div>
            <div style={{ fontSize:11,color:"#64748b",marginTop:1 }}>
              {s.sector}
              {!hasQ && <span style={{ marginLeft:6,color:"#334155" }}>• click to load price</span>}
            </div>
          </div>
        </div>
      </td>

      {/* % Change */}
      <td style={{ padding:"11px 16px",textAlign:"right" }}>
        {chgPct != null
          ? <span style={{
              padding:"3px 8px",borderRadius:99,fontSize:12,fontWeight:700,
              background:chgPct>=0?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",
              color:chgPct>=0?"#22c55e":"#ef4444",
            }}>{chgPct>=0?"+":""}{chgPct.toFixed(2)}%</span>
          : <span style={{ color:"#334155",fontSize:12 }}>—</span>
        }
      </td>

      {/* Price */}
      <td style={{ padding:"11px 16px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:"#e2e8f0" }}>
        {s.price ? formatPrice(s.price) : "—"}
      </td>

      {/* Market Cap */}
      <td style={{ padding:"11px 16px",textAlign:"right",fontSize:12,color:"#64748b" }}>
        {s.marketCap ? formatMarketCap(s.marketCap) : "—"}
      </td>

      {/* Volume */}
      <td style={{ padding:"11px 16px",textAlign:"right",fontSize:12,color:"#64748b" }}>
        {s.volume ? Number(s.volume).toLocaleString("en-IN") : "—"}
      </td>

      {/* P/E */}
      <td style={{ padding:"11px 16px",textAlign:"right",fontSize:12,color:"#64748b" }}>
        {s.peRatio ? s.peRatio.toFixed(1) : "—"}
      </td>

      {/* Watch button */}
      <td style={{ padding:"11px 16px",textAlign:"center" }} onClick={e => e.stopPropagation()}>
        <button onClick={toggleWatch} disabled={localLoading} style={{
          padding:"4px 12px",borderRadius:6,fontSize:12,cursor:"pointer",fontWeight:600,
          border:`1px solid ${isWatched ? "#22c55e" : "rgba(249,115,22,0.4)"}`,
          background: isWatched ? "rgba(34,197,94,0.1)" : "rgba(249,115,22,0.08)",
          color: isWatched ? "#22c55e" : "#f97316",
          transition:"all 0.15s",
        }}>
          {localLoading ? "…" : isWatched ? "✓ Watching" : "+ Watch"}
        </button>
      </td>
    </tr>
  );
}

const thStyle = {
  padding:"12px 16px", textAlign:"left",
  fontSize:11, color:"#64748b",
  fontWeight:600, letterSpacing:"0.08em",
  whiteSpace:"nowrap", userSelect:"none",
};

const pageBtn = (disabled) => ({
  padding:"4px 12px",borderRadius:6,fontSize:12,
  border:`1px solid #1e3a5f`,
  background:"transparent",
  color:disabled?"#334155":"#94a3b8",
  cursor:disabled?"not-allowed":"pointer",
});
