// App.js
import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider, useDispatch, useSelector } from "react-redux";
import {
  store,
  fetchAllData, fetchMarketOverview, fetchWatchlist, refreshQuotes,
  selectStocksState, selectAuth,
} from "./store";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import StockDetail from "./pages/StockDetail";
import Screener from "./pages/Screener";
import MarketOverview from "./pages/MarketOverview";
import Watchlist from "./pages/Watchlist";
import Auth from "./pages/Auth";

// ─── Auth guard ───────────────────────────────────────────────────────────────
function RequireAuth({ children }) {
  const { user } = useSelector(selectAuth);
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

// ─── Data bootstrapper ────────────────────────────────────────────────────────
function DataLoader() {
  const dispatch   = useDispatch();
  const { user }   = useSelector(selectAuth);
  const { loading, list } = useSelector(selectStocksState);

  useEffect(() => {
    // Load stocks + quotes once
    dispatch(fetchAllData());
    dispatch(fetchMarketOverview());
  }, []);

  // Load watchlist whenever user logs in
  useEffect(() => {
    if (user) dispatch(fetchWatchlist());
  }, [user]);

  // Auto-refresh quotes every 90s
  useEffect(() => {
    if (list.length === 0) return;
    const id = setInterval(() => {
      dispatch(refreshQuotes(list.map(s => s.symbol)));
    }, 90_000);
    return () => clearInterval(id);
  }, [list]);

  return null;
}

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingScreen() {
  const { loading, loadingMsg, error } = useSelector(selectStocksState);

  if (error) return (
    <div style={cs.center}>
      <div style={{ fontSize:40 }}>⚠️</div>
      <div style={{ color:"#ef4444",fontFamily:"'Syne',sans-serif",fontSize:18 }}>Server Error</div>
      <div style={{ color:"#64748b",fontSize:14,maxWidth:400,textAlign:"center" }}>{error}</div>
      <div style={{ color:"#475569",fontSize:12,marginTop:8 }}>
        Start server: <code style={{ color:"#f97316" }}>uvicorn main:app --port 5001</code>
      </div>
    </div>
  );

  if (loading) return (
    <div style={cs.center}>
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:24 }}>
        <span style={{ fontSize:36 }}>📈</span>
        <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:28,letterSpacing:"0.15em",background:"linear-gradient(135deg,#f97316,#fb923c)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
          STOCKPULSE
        </span>
      </div>
      <div style={{ width:48,height:48,border:"3px solid #1e293b",borderTop:"3px solid #f97316",borderRadius:"50%",animation:"spin 0.8s linear infinite",marginBottom:20 }}/>
      <div style={{ color:"#e2e8f0",fontFamily:"'Syne',sans-serif",fontSize:15,marginBottom:6 }}>{loadingMsg}</div>
      <div style={{ color:"#475569",fontSize:12 }}>First load fetches live NSE data (~15s)</div>
      <div style={{ display:"flex",gap:8,marginTop:16 }}>
        {[0,1,2].map(i=>(
          <div key={i} style={{ width:8,height:8,borderRadius:"50%",background:"#f97316",animation:`pulse 1.2s ease-in-out ${i*0.4}s infinite` }}/>
        ))}
      </div>
      <div style={{ color:"#334155",fontSize:11,marginTop:12 }}>🇮🇳 NSE India · NIFTY 50 · yfinance</div>
    </div>
  );

  return null;
}

// ─── Main app ─────────────────────────────────────────────────────────────────
function AppContent() {
  const { loading, error } = useSelector(selectStocksState);
  const { user } = useSelector(selectAuth);

  if (loading || error) return <LoadingScreen />;

  return (
    <>
      <Header />
      <Routes>
        <Route path="/"               element={<Dashboard />} />
        <Route path="/stock/:symbol"  element={<StockDetail />} />
        <Route path="/screener"       element={<Screener />} />
        <Route path="/market"         element={<MarketOverview />} />
        <Route path="/auth"           element={user ? <Navigate to="/" replace /> : <Auth />} />
        <Route path="/watchlist"      element={
          <RequireAuth><Watchlist /></RequireAuth>
        } />
        <Route path="*"               element={<Dashboard />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <style>{`
          * { box-sizing:border-box; margin:0; padding:0; }
          body { background:#080f1e; color:#e2e8f0; }
          @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
          @keyframes spin   { to { transform:rotate(360deg); } }
          @keyframes pulse  { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1.1)} }
          @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
          ::-webkit-scrollbar { width:6px; }
          ::-webkit-scrollbar-track { background:#0a1628; }
          ::-webkit-scrollbar-thumb { background:#1e293b;border-radius:3px; }
          a { color:inherit; text-decoration:none; }
          button,input { font-family:inherit; }
        `}</style>
        <DataLoader />
        <AppContent />
      </BrowserRouter>
    </Provider>
  );
}

const cs = {
  center: {
    minHeight:"100vh",background:"#080f1e",
    display:"flex",alignItems:"center",justifyContent:"center",
    flexDirection:"column",gap:12,
  },
};
