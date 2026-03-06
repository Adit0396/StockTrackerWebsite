// components/Header.js
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout, selectAuth, selectStocksState } from "../store";
import api from "../utils/api";

const C = {
  orange:"#f97316",orangeLight:"#fb923c",bg:"#080f1e",surface:"#0d1b2e",
  border:"#1e3a5f",text:"#e2e8f0",muted:"#64748b",green:"#22c55e",red:"#ef4444",
};

function useDebounce(v,d){const[dv,setDv]=useState(v);useEffect(()=>{const t=setTimeout(()=>setDv(v),d);return()=>clearTimeout(t);},[v,d]);return dv;}

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { quotesLoading, lastUpdated } = useSelector(selectStocksState);
  const { user } = useSelector(selectAuth);

  const inputRef = useRef(null);
  const dropRef  = useRef(null);
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState([]);
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState(0);
  const dq = useDebounce(query, 200);

  useEffect(() => {
    if (!dq.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    api.search(dq, 15).then(d => { setResults(d); setOpen(true); setSelected(0); }).catch(()=>{}).finally(()=>setLoading(false));
  }, [dq]);

  useEffect(() => {
    const h = e => { if(dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pick = s => { setQuery(""); setResults([]); setOpen(false); navigate(`/stock/${encodeURIComponent(s.symbol)}`); };

  const onKey = e => {
    if (!open||!results.length) return;
    if (e.key==="ArrowDown") { e.preventDefault(); setSelected(v=>Math.min(v+1,results.length-1)); }
    if (e.key==="ArrowUp")   { e.preventDefault(); setSelected(v=>Math.max(v-1,0)); }
    if (e.key==="Enter")     { e.preventDefault(); if(results[selected]) pick(results[selected]); }
    if (e.key==="Escape")    setOpen(false);
  };

  const isActive = p => location.pathname === p;
  const lastTime = lastUpdated ? new Date(lastUpdated).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}) : null;

  return (
    <header style={{ background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 20px",height:60,display:"flex",alignItems:"center",gap:16,position:"sticky",top:0,zIndex:100 }}>
      {/* Logo */}
      <Link to="/" style={{ display:"flex",alignItems:"center",gap:8,textDecoration:"none",flexShrink:0 }}>
        <span style={{ fontSize:20 }}>📈</span>
        <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,letterSpacing:"0.12em",background:`linear-gradient(135deg,${C.orange},${C.orangeLight})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>STOCKPULSE</span>
        <span style={{ fontSize:10,padding:"2px 7px",borderRadius:99,fontWeight:700,background:"rgba(249,115,22,0.15)",color:C.orange,border:"1px solid rgba(249,115,22,0.3)" }}>🇮🇳 NSE</span>
      </Link>

      {/* Search */}
      <div ref={dropRef} style={{ flex:1,maxWidth:460,position:"relative" }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,background:"#0a1628",border:`1px solid ${open?C.orange:C.border}`,borderRadius:8,padding:"0 12px",height:36,transition:"border-color 0.2s" }}>
          <span style={{ color:C.muted,fontSize:13 }}>{loading?"⏳":"🔍"}</span>
          <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={onKey} onFocus={()=>results.length&&setOpen(true)}
            placeholder="Search 2600+ NSE stocks…"
            style={{ flex:1,background:"transparent",border:"none",outline:"none",color:C.text,fontSize:13,fontFamily:"inherit" }}/>
          {query && <button onClick={()=>{setQuery("");setResults([]);setOpen(false);}} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0 }}>✕</button>}
        </div>

        {open && results.length > 0 && (
          <div style={{ position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,boxShadow:"0 20px 60px rgba(0,0,0,0.6)",zIndex:200,maxHeight:370,overflowY:"auto" }}>
            <div style={{ padding:"7px 12px 3px",fontSize:10,color:C.muted,fontWeight:700,letterSpacing:"0.1em" }}>{results.length} RESULTS</div>
            {results.map((s,i) => {
              const sym=s.symbol.replace(".NS",""); const chg=s.changePercent;
              return (
                <div key={s.symbol} onMouseDown={()=>pick(s)} onMouseEnter={()=>setSelected(i)}
                  style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 12px",cursor:"pointer",transition:"background 0.1s",background:i===selected?"rgba(249,115,22,0.08)":"transparent",borderLeft:i===selected?`2px solid ${C.orange}`:"2px solid transparent" }}>
                  <div style={{ minWidth:78,padding:"3px 8px",borderRadius:5,textAlign:"center",background:"rgba(249,115,22,0.1)",border:"1px solid rgba(249,115,22,0.2)",fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:700,color:C.orange }}>{sym}</div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,color:C.text,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{s.name}</div>
                    <div style={{ fontSize:11,color:C.muted }}>{s.sector}</div>
                  </div>
                  {s.price && (
                    <div style={{ textAlign:"right",flexShrink:0 }}>
                      <div style={{ fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:C.text }}>₹{Number(s.price).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                      {chg!=null && <div style={{ fontSize:11,color:chg>=0?C.green:C.red,fontWeight:600 }}>{chg>=0?"+":""}{Number(chg).toFixed(2)}%</div>}
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ padding:"5px 12px",fontSize:10,color:"#334155",borderTop:`1px solid ${C.border}` }}>↑↓ navigate · Enter select · Esc close</div>
          </div>
        )}
        {open && query && !loading && results.length===0 && (
          <div style={{ position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"16px",textAlign:"center",color:C.muted,fontSize:13,zIndex:200 }}>
            No results for "{query}"
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ display:"flex",gap:4,flexShrink:0 }}>
        {[
          {path:"/",label:"Dashboard"},
          {path:"/screener",label:"Screener"},
          {path:"/market",label:"Market"},
          {path:"/watchlist",label:"⭐ Watchlist"},
        ].map(({path,label}) => (
          <Link key={path} to={path} style={{ padding:"6px 12px",borderRadius:6,fontSize:13,fontWeight:500,textDecoration:"none",color:isActive(path)?C.orange:C.muted,background:isActive(path)?"rgba(249,115,22,0.1)":"transparent",border:isActive(path)?"1px solid rgba(249,115,22,0.25)":"1px solid transparent",transition:"all 0.15s" }}>{label}</Link>
        ))}
      </nav>

      {/* User + status */}
      <div style={{ display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
        {quotesLoading
          ? <span style={{ fontSize:11,color:C.orange,display:"flex",alignItems:"center",gap:4 }}>
              <span style={{ width:6,height:6,borderRadius:"50%",background:C.orange,display:"inline-block",animation:"pulse 1s infinite" }}/>Refreshing
            </span>
          : lastTime && <span style={{ fontSize:11,color:C.muted }}>{lastTime}</span>
        }
        {user
          ? <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <span style={{ fontSize:12,color:C.muted }}>👤 {user.username}</span>
              <button onClick={()=>dispatch(logout())} style={{ padding:"4px 10px",borderRadius:6,fontSize:12,cursor:"pointer",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",color:"#ef4444",fontWeight:600 }}>Sign out</button>
            </div>
          : <Link to="/auth" style={{ padding:"6px 14px",borderRadius:6,fontSize:13,fontWeight:600,background:`linear-gradient(135deg,${C.orange},${C.orangeLight})`,color:"white",textDecoration:"none" }}>Sign In</Link>
        }
      </div>
    </header>
  );
}
