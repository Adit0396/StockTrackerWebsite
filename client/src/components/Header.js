import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useStock } from "../context/StockContext";

export default function Header() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { lastUpdated, quotesLoading } = useStock();
  const [query, setQuery]             = useState("");
  const [results, setResults]         = useState([]);
  const [showDrop, setShowDrop]       = useState(false);
  const searchRef   = useRef();
  const debounceRef = useRef();

  const handleSearch = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (!q) { setResults([]); setShowDrop(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.search(q);
        setResults(data.slice(0, 8));
        setShowDrop(true);
      } catch { setResults([]); }
    }, 280);
  };

  useEffect(() => {
    const close = (e) => { if (!searchRef.current?.contains(e.target)) setShowDrop(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const navLinks = [
    { to: "/",        label: "Dashboard" },
    { to: "/screener",label: "Screener"  },
    { to: "/market",  label: "Market"    },
  ];

  const isActive = (p) => location.pathname === p;

  return (
    <header style={S.header}>
      {/* Logo */}
      <div style={S.left}>
        <Link to="/" style={S.logoLink}>
          <span style={{ fontSize: 22 }}>📈</span>
          <span style={S.logoText}>STOCKPULSE</span>
        </Link>
        <span style={S.badge}>🇮🇳 NSE India</span>
      </div>

      {/* Nav */}
      <nav style={S.nav}>
        {navLinks.map((l) => (
          <Link key={l.to} to={l.to} style={{
            ...S.navLink,
            color: isActive(l.to) ? "#e2e8f0" : "#64748b",
            borderBottom: isActive(l.to) ? "2px solid #6366f1" : "2px solid transparent",
          }}>
            {l.label}
          </Link>
        ))}
      </nav>

      {/* Right: search + status */}
      <div style={S.right}>
        <div ref={searchRef} style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Search stock or name..."
            value={query}
            onChange={handleSearch}
            onFocus={() => results.length && setShowDrop(true)}
            style={S.search}
          />
          {showDrop && results.length > 0 && (
            <div style={S.dropdown}>
              {results.map((r) => (
                <div key={r.symbol}
                  onClick={() => { navigate(`/stock/${encodeURIComponent(r.symbol)}`); setQuery(""); setShowDrop(false); }}
                  style={S.dropItem}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(99,102,241,0.15)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ color: "#a5b4fc", fontFamily: "monospace", fontSize: 13 }}>{r.symbol.replace(".NS", "")}</span>
                  <span style={{ color: "#94a3b8", fontSize: 12, marginLeft: 10, flex: 1 }}>{r.name}</span>
                  <span style={{ color: "#475569", fontSize: 11 }}>{r.sector}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={S.statusChip}>
          <div style={{ ...S.dot, background: quotesLoading ? "#f59e0b" : "#22c55e" }} />
          <span style={{ color: "#64748b", fontSize: 11 }}>
            {quotesLoading ? "Updating..." : lastUpdated ? new Date(lastUpdated).toLocaleTimeString("en-IN") : "Live"}
          </span>
        </div>
      </div>
    </header>
  );
}

const S = {
  header:    { position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 60, background: "rgba(8,15,30,0.97)", backdropFilter: "blur(16px)", borderBottom: "1px solid #1e293b", gap: 16 },
  left:      { display: "flex", alignItems: "center", gap: 12, flexShrink: 0 },
  logoLink:  { display: "flex", alignItems: "center", gap: 10, textDecoration: "none" },
  logoText:  { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: "0.15em", background: "linear-gradient(135deg,#f97316,#fb923c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  badge:     { background: "rgba(249,115,22,0.12)", color: "#fb923c", padding: "2px 10px", borderRadius: 20, fontSize: 11, letterSpacing: "0.05em", border: "1px solid rgba(249,115,22,0.25)" },
  nav:       { display: "flex" },
  navLink:   { padding: "8px 18px", fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 13, letterSpacing: "0.05em", textDecoration: "none", transition: "color 0.2s" },
  right:     { display: "flex", alignItems: "center", gap: 12, flexShrink: 0 },
  search:    { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "7px 14px", color: "#e2e8f0", fontFamily: "monospace", fontSize: 13, width: 220, outline: "none" },
  dropdown:  { position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#0d1829", border: "1px solid #1e293b", borderRadius: 10, zIndex: 200, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" },
  dropItem:  { display: "flex", alignItems: "center", padding: "10px 14px", cursor: "pointer", gap: 8 },
  statusChip:{ display: "flex", alignItems: "center", gap: 6, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "6px 12px" },
  dot:       { width: 7, height: 7, borderRadius: "50%" },
};
