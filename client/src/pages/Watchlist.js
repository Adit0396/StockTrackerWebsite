import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { formatMarketCap } from "../utils/format";

const C = {
  orange:"#f97316",bg:"#080f1e",surface:"#0d1b2e",card:"#0f1f35",
  border:"#1e3a5f",text:"#e2e8f0",muted:"#64748b",green:"#22c55e",red:"#ef4444",
};

export default function Watchlist() {
  const navigate = useNavigate();
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getWatchlistQuotes();
      setItems(data);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refresh]);

  const remove = async (symbol) => {
    await api.removeFromWatchlist(symbol).catch(console.error);
    setItems(prev => prev.filter(i => i.symbol !== symbol));
  };

  if (loading && items.length === 0) return (
    <div style={{ minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ color:C.muted,fontSize:15 }}>Loading watchlist…</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",background:C.bg,padding:"24px" }}>
      <div style={{ maxWidth:1100,margin:"0 auto" }}>

        {/* Header */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24 }}>
          <div>
            <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:C.text,marginBottom:4 }}>
              ⭐ My Watchlist
            </h1>
            <p style={{ color:C.muted,fontSize:13 }}>
              {items.length} stock{items.length!==1?"s":""} tracked · saved to server
            </p>
          </div>
          <button onClick={() => setRefresh(r=>r+1)} style={{
            padding:"8px 16px",borderRadius:8,fontSize:13,cursor:"pointer",fontWeight:600,
            background:"rgba(249,115,22,0.1)",border:"1px solid rgba(249,115,22,0.3)",color:C.orange,
          }}>
            ↻ Refresh prices
          </button>
        </div>

        {items.length === 0 ? (
          <div style={{
            background:C.surface,borderRadius:16,border:`1px solid ${C.border}`,
            padding:"60px 24px",textAlign:"center",
          }}>
            <div style={{ fontSize:48,marginBottom:16 }}>⭐</div>
            <div style={{ fontSize:18,color:C.text,fontWeight:600,marginBottom:8 }}>Your watchlist is empty</div>
            <div style={{ fontSize:14,color:C.muted,marginBottom:24 }}>
              Use the Screener to find stocks and click "+ Watch" to add them here
            </div>
            <button onClick={() => navigate("/screener")} style={{
              padding:"10px 24px",borderRadius:8,fontSize:14,cursor:"pointer",fontWeight:600,
              background:`linear-gradient(135deg,${C.orange},#fb923c)`,border:"none",color:"white",
            }}>Browse Screener →</button>
          </div>
        ) : (
          <div style={{ display:"grid",gap:12 }}>
            {/* Table header */}
            <div style={{
              display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr auto",
              padding:"10px 16px",fontSize:11,color:C.muted,fontWeight:700,letterSpacing:"0.08em",
            }}>
              <span>STOCK</span>
              <span style={{ textAlign:"right" }}>PRICE</span>
              <span style={{ textAlign:"right" }}>CHANGE</span>
              <span style={{ textAlign:"right" }}>MKT CAP</span>
              <span style={{ textAlign:"right" }}>ADDED</span>
              <span></span>
            </div>

            {items.map(item => {
              const sym    = item.symbol?.replace(".NS","");
              const chgPct = item.changePercent;
              const addedDate = item.addedAt
                ? new Date(item.addedAt).toLocaleDateString("en-IN",{day:"numeric",month:"short"})
                : "—";

              return (
                <div key={item.symbol} style={{
                  background:C.surface,borderRadius:10,border:`1px solid ${C.border}`,
                  display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr auto",
                  padding:"14px 16px",alignItems:"center",
                  cursor:"pointer",transition:"border-color 0.15s",
                }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=C.orange}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}
                  onClick={() => navigate(`/stock/${encodeURIComponent(item.symbol)}`)}
                >
                  {/* Name */}
                  <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                    <div style={{
                      padding:"3px 8px",borderRadius:5,
                      background:"rgba(249,115,22,0.1)",border:"1px solid rgba(249,115,22,0.2)",
                      fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:700,color:C.orange,
                      minWidth:65,textAlign:"center",
                    }}>{sym}</div>
                    <div>
                      <div style={{ fontSize:14,color:C.text,fontWeight:500 }}>{item.name}</div>
                      <div style={{ fontSize:11,color:C.muted }}>{item.sector}</div>
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:14,color:C.text }}>
                    {item.price
                      ? `₹${Number(item.price).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`
                      : <span style={{ color:C.muted }}>—</span>}
                  </div>

                  {/* Change */}
                  <div style={{ textAlign:"right" }}>
                    {chgPct != null
                      ? <span style={{
                          padding:"3px 8px",borderRadius:99,fontSize:12,fontWeight:700,
                          background:chgPct>=0?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",
                          color:chgPct>=0?C.green:C.red,
                        }}>{chgPct>=0?"+":""}{chgPct.toFixed(2)}%</span>
                      : <span style={{ color:C.muted,fontSize:12 }}>—</span>}
                  </div>

                  {/* Market cap */}
                  <div style={{ textAlign:"right",fontSize:13,color:C.muted }}>
                    {item.marketCap ? formatMarketCap(item.marketCap) : "—"}
                  </div>

                  {/* Added date */}
                  <div style={{ textAlign:"right",fontSize:12,color:C.muted }}>{addedDate}</div>

                  {/* Remove */}
                  <div onClick={e => { e.stopPropagation(); remove(item.symbol); }}>
                    <button style={{
                      padding:"4px 10px",borderRadius:6,fontSize:12,cursor:"pointer",fontWeight:600,
                      background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",
                      color:C.red,transition:"all 0.15s",marginLeft:8,
                    }}>✕ Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary stats */}
        {items.length > 0 && (
          <div style={{
            marginTop:24,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,
          }}>
            {[
              { label:"Total Stocks",  value: items.length },
              { label:"Gainers",       value: items.filter(i=>(i.changePercent||0)>0).length, color:C.green },
              { label:"Losers",        value: items.filter(i=>(i.changePercent||0)<0).length, color:C.red },
              { label:"Avg Change",    value: items.some(i=>i.changePercent!=null)
                  ? ((items.reduce((s,i)=>s+(i.changePercent||0),0)/items.filter(i=>i.changePercent!=null).length).toFixed(2)+"%")
                  : "—",
                color: (() => {
                  const avg = items.reduce((s,i)=>s+(i.changePercent||0),0)/items.filter(i=>i.changePercent!=null).length;
                  return avg>=0?C.green:C.red;
                })()
              },
            ].map(stat => (
              <div key={stat.label} style={{
                background:C.surface,borderRadius:10,border:`1px solid ${C.border}`,
                padding:"14px 16px",textAlign:"center",
              }}>
                <div style={{ fontSize:22,fontWeight:800,color:stat.color||C.text,fontFamily:"'Syne',sans-serif" }}>
                  {stat.value}
                </div>
                <div style={{ fontSize:11,color:C.muted,marginTop:4,fontWeight:600,letterSpacing:"0.06em" }}>
                  {stat.label.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
