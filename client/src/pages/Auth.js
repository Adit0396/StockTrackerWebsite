// pages/Auth.js
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setAuth, setAuthError, selectAuth } from "../store";
import api from "../utils/api";

const C = {
  orange:"#f97316",bg:"#080f1e",surface:"#0d1b2e",border:"#1e3a5f",
  text:"#e2e8f0",muted:"#64748b",red:"#ef4444",green:"#22c55e",
};

export default function Auth() {
  const dispatch = useDispatch();
  const { error } = useSelector(selectAuth);
  const [mode,     setMode]     = useState("login");
  const [loading,  setLoading]  = useState(false);
  const [form,     setForm]     = useState({ email:"", password:"" });
  const [localErr, setLocalErr] = useState("");

  const err = localErr || error;
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLocalErr(""); setLoading(true);
    try {
      let data;
      if (mode === "login") {
        data = await api.login(form.email, form.password);
      } else {
        if (form.password.length < 6) { setLocalErr("Password must be at least 6 characters"); setLoading(false); return; }
        data = await api.register(form.email, form.password);
      }
      dispatch(setAuth({ token: data.token, user: data.user }));
    } catch (err) {
      setLocalErr(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:"100vh", background:C.bg,
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:24,
    }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>📈</div>
          <div style={{
            fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:26, letterSpacing:"0.12em",
            background:`linear-gradient(135deg,${C.orange},#fb923c)`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>STOCKPULSE</div>
          <div style={{ color:C.muted, fontSize:13, marginTop:4 }}>🇮🇳 NSE India · Real-time stock intelligence</div>
        </div>

        {/* Card */}
        <div style={{
          background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:32,
          boxShadow:"0 24px 64px rgba(0,0,0,0.4)",
        }}>
          {/* Tab toggle */}
          <div style={{ display:"flex", background:"#0a1628", borderRadius:8, padding:4, marginBottom:28 }}>
            {["login","register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setLocalErr(""); }} style={{
                flex:1, padding:"8px 0", borderRadius:6, border:"none", cursor:"pointer",
                fontFamily:"inherit", fontSize:13, fontWeight:600, transition:"all 0.2s",
                background: mode===m ? `rgba(249,115,22,0.15)` : "transparent",
                color: mode===m ? C.orange : C.muted,
              }}>
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* Email */}
            <div>
              <label style={{ fontSize:12, color:C.muted, fontWeight:600, letterSpacing:"0.06em", display:"block", marginBottom:6 }}>
                EMAIL
              </label>
              <input
                value={form.email} onChange={set("email")}
                type="email" required autoComplete="email"
                placeholder="you@example.com"
                style={inputStyle}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize:12, color:C.muted, fontWeight:600, letterSpacing:"0.06em", display:"block", marginBottom:6 }}>
                PASSWORD
              </label>
              <input
                value={form.password} onChange={set("password")}
                type="password" required autoComplete={mode==="login"?"current-password":"new-password"}
                placeholder={mode==="login" ? "your password" : "min 6 characters"}
                style={inputStyle}
              />
            </div>

            {/* Error */}
            {err && (
              <div style={{
                background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)",
                borderRadius:8, padding:"10px 14px", fontSize:13, color:C.red,
              }}>⚠ {err}</div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              padding:"12px 0", borderRadius:8, border:"none", cursor:loading?"not-allowed":"pointer",
              fontFamily:"inherit", fontSize:14, fontWeight:700, letterSpacing:"0.04em",
              background: loading ? "#1e3a5f" : `linear-gradient(135deg,${C.orange},#fb923c)`,
              color: loading ? C.muted : "white",
              transition:"all 0.2s", marginTop:4,
            }}>
              {loading ? "Please wait…" : mode==="login" ? "Sign In →" : "Create Account →"}
            </button>
          </form>

          {/* Toggle link */}
          <div style={{ textAlign:"center", marginTop:20, fontSize:13, color:C.muted }}>
            {mode==="login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setMode(mode==="login"?"register":"login"); setLocalErr(""); }} style={{
              background:"none", border:"none", color:C.orange, cursor:"pointer",
              fontSize:13, fontWeight:600, padding:0,
            }}>
              {mode==="login" ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>

        <div style={{ textAlign:"center", marginTop:16, fontSize:11, color:"#334155" }}>
          Your data is stored securely · Passwords are hashed with bcrypt
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width:"100%", background:"#0a1628", border:"1px solid #1e3a5f", borderRadius:8,
  padding:"11px 14px", color:"#e2e8f0", fontSize:14, fontFamily:"inherit", outline:"none",
  transition:"border-color 0.2s", boxSizing:"border-box",
};
