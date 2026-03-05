"""
StockPulse India — Python Backend
FastAPI + yfinance · Dynamic NIFTY 50 from NSE API

Run:
    pip install fastapi uvicorn yfinance pandas python-dotenv requests
    uvicorn main:app --reload --port 5001
"""

import os, time, asyncio, requests
from datetime import datetime, timedelta
from typing import Optional

import yfinance as yf
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="StockPulse India")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── TTL Cache ────────────────────────────────────────────────────────────────
class TTLCache:
    def __init__(self):
        self._s: dict = {}

    def get(self, key: str):
        e = self._s.get(key)
        if e and time.time() < e["exp"]:
            return e["val"]
        if e:
            del self._s[key]
        return None

    def set(self, key: str, val, ttl: int):
        self._s[key] = {"val": val, "exp": time.time() + ttl}

    def clear(self):
        self._s.clear()

    def stats(self):
        now = time.time()
        return {"keys": sum(1 for e in self._s.values() if now < e["exp"])}

cache = TTLCache()

# ─── Rate limiter ─────────────────────────────────────────────────────────────
_fetch_lock = asyncio.Lock()
_last_fetch = 0.0
MIN_INTERVAL = 1.0

async def rate_limited(fn, *args, **kwargs):
    global _last_fetch
    async with _fetch_lock:
        wait = MIN_INTERVAL - (time.time() - _last_fetch)
        if wait > 0:
            await asyncio.sleep(wait)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, lambda: fn(*args, **kwargs))
        _last_fetch = time.time()
        return result

# ─── Sector mapping ───────────────────────────────────────────────────────────
SECTOR_MAP = {
    "FINANCIAL SERVICES": "Finance",
    "BANK": "Finance",
    "INSURANCE": "Finance",
    "IT": "Technology",
    "INFORMATION TECHNOLOGY": "Technology",
    "OIL & GAS": "Energy",
    "POWER": "Utilities",
    "FMCG": "Consumer",
    "CONSUMER GOODS": "Consumer",
    "CONSUMER DURABLES": "Consumer",
    "AUTOMOBILE": "Auto",
    "AUTO": "Auto",
    "PHARMA": "Healthcare",
    "HEALTHCARE": "Healthcare",
    "METAL": "Materials",
    "CEMENT": "Materials",
    "CHEMICALS": "Materials",
    "TELECOM": "Telecom",
    "REALTY": "Real Estate",
    "CONSTRUCTION": "Infrastructure",
    "INFRASTRUCTURE": "Infrastructure",
    "DIVERSIFIED": "Conglomerate",
    "SERVICES": "Services",
}

def map_sector(raw: str) -> str:
    if not raw:
        return "Other"
    upper = raw.upper().strip()
    for key, val in SECTOR_MAP.items():
        if key in upper:
            return val
    return raw.title()

# ─── Fallback stock list (used if NSE API is unreachable) ────────────────────
FALLBACK_STOCKS = [
    {"symbol": "RELIANCE.NS",   "name": "Reliance Industries",  "sector": "Energy"},
    {"symbol": "TCS.NS",        "name": "Tata Consultancy",     "sector": "Technology"},
    {"symbol": "HDFCBANK.NS",   "name": "HDFC Bank",            "sector": "Finance"},
    {"symbol": "INFY.NS",       "name": "Infosys",              "sector": "Technology"},
    {"symbol": "ICICIBANK.NS",  "name": "ICICI Bank",           "sector": "Finance"},
    {"symbol": "HINDUNILVR.NS", "name": "Hindustan Unilever",   "sector": "Consumer"},
    {"symbol": "WIPRO.NS",      "name": "Wipro",                "sector": "Technology"},
    {"symbol": "BHARTIARTL.NS", "name": "Bharti Airtel",        "sector": "Telecom"},
    {"symbol": "ITC.NS",        "name": "ITC Limited",          "sector": "Consumer"},
    {"symbol": "KOTAKBANK.NS",  "name": "Kotak Mahindra Bank",  "sector": "Finance"},
    {"symbol": "BAJFINANCE.NS", "name": "Bajaj Finance",        "sector": "Finance"},
    {"symbol": "HCLTECH.NS",    "name": "HCL Technologies",     "sector": "Technology"},
    {"symbol": "SBIN.NS",       "name": "State Bank of India",  "sector": "Finance"},
    {"symbol": "AXISBANK.NS",   "name": "Axis Bank",            "sector": "Finance"},
    {"symbol": "MARUTI.NS",     "name": "Maruti Suzuki",        "sector": "Auto"},
    {"symbol": "SUNPHARMA.NS",  "name": "Sun Pharmaceutical",   "sector": "Healthcare"},
    {"symbol": "TATAMOTOR.NS",  "name": "Tata Motors",          "sector": "Auto"},
    {"symbol": "TITAN.NS",      "name": "Titan Company",        "sector": "Consumer"},
    {"symbol": "NESTLEIND.NS",  "name": "Nestle India",         "sector": "Consumer"},
    {"symbol": "POWERGRID.NS",  "name": "Power Grid Corp",      "sector": "Utilities"},
    {"symbol": "NTPC.NS",       "name": "NTPC Limited",         "sector": "Utilities"},
    {"symbol": "ONGC.NS",       "name": "Oil & Natural Gas",    "sector": "Energy"},
    {"symbol": "TATASTEEL.NS",  "name": "Tata Steel",           "sector": "Materials"},
    {"symbol": "JSWSTEEL.NS",   "name": "JSW Steel",            "sector": "Materials"},
    {"symbol": "ASIANPAINT.NS", "name": "Asian Paints",         "sector": "Materials"},
    {"symbol": "ULTRACEMCO.NS", "name": "UltraTech Cement",     "sector": "Materials"},
    {"symbol": "BAJAJFINSV.NS", "name": "Bajaj Finserv",        "sector": "Finance"},
    {"symbol": "DMART.NS",      "name": "Avenue Supermarts",    "sector": "Retail"},
    {"symbol": "ADANIENT.NS",   "name": "Adani Enterprises",    "sector": "Conglomerate"},
    {"symbol": "M&M.NS",        "name": "Mahindra & Mahindra",  "sector": "Auto"},
    {"symbol": "LTIM.NS",       "name": "LTIMindtree",          "sector": "Technology"},
    {"symbol": "TECHM.NS",      "name": "Tech Mahindra",        "sector": "Technology"},
    {"symbol": "COALINDIA.NS",  "name": "Coal India",           "sector": "Energy"},
    {"symbol": "BPCL.NS",       "name": "BPCL",                 "sector": "Energy"},
    {"symbol": "HINDALCO.NS",   "name": "Hindalco Industries",  "sector": "Materials"},
    {"symbol": "CIPLA.NS",      "name": "Cipla",                "sector": "Healthcare"},
    {"symbol": "DRREDDY.NS",    "name": "Dr Reddy's Labs",      "sector": "Healthcare"},
    {"symbol": "APOLLOHOSP.NS", "name": "Apollo Hospitals",     "sector": "Healthcare"},
    {"symbol": "EICHERMOT.NS",  "name": "Eicher Motors",        "sector": "Auto"},
    {"symbol": "SHRIRAMFIN.NS", "name": "Shriram Finance",      "sector": "Finance"},
    {"symbol": "DIVISLAB.NS",   "name": "Divi's Laboratories",  "sector": "Healthcare"},
    {"symbol": "HEROMOTOCO.NS", "name": "Hero MotoCorp",        "sector": "Auto"},
    {"symbol": "GRASIM.NS",     "name": "Grasim Industries",    "sector": "Materials"},
    {"symbol": "SBILIFE.NS",    "name": "SBI Life Insurance",   "sector": "Finance"},
    {"symbol": "HDFCLIFE.NS",   "name": "HDFC Life Insurance",  "sector": "Finance"},
    {"symbol": "INDUSINDBK.NS", "name": "IndusInd Bank",        "sector": "Finance"},
    {"symbol": "TRENT.NS",      "name": "Trent",                "sector": "Retail"},
    {"symbol": "BEL.NS",        "name": "Bharat Electronics",   "sector": "Infrastructure"},
    {"symbol": "BRITANNIA.NS",  "name": "Britannia Industries", "sector": "Consumer"},
    {"symbol": "BAJAJ-AUTO.NS", "name": "Bajaj Auto",           "sector": "Auto"},
]

# ─── Dynamic NIFTY 50 loader ──────────────────────────────────────────────────
NSE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.nseindia.com/",
    "Connection": "keep-alive",
}

def _load_nifty50_from_nse() -> list[dict]:
    try:
        session = requests.Session()
        session.get("https://www.nseindia.com", headers=NSE_HEADERS, timeout=10)
        time.sleep(1.5)

        resp = session.get(
            "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050",
            headers=NSE_HEADERS,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()

        stocks = []
        for item in data.get("data", []):
            sym_nse = item.get("symbol", "").strip()
            if not sym_nse or sym_nse == "NIFTY 50":
                continue
            yf_sym = sym_nse + ".NS"
            meta   = item.get("meta", {}) or {}
            name   = meta.get("companyName") or sym_nse
            ind    = meta.get("industry") or ""
            stocks.append({
                "symbol": yf_sym,
                "name":   name,
                "sector": map_sector(ind),
                "region": "INDIA",
            })

        if len(stocks) >= 40:
            print(f"✅ Loaded {len(stocks)} NIFTY 50 constituents from NSE API")
            return stocks
        print(f"⚠️  NSE API only returned {len(stocks)} stocks — using fallback")
        return []
    except Exception as e:
        print(f"⚠️  NSE API error ({e}) — using fallback list")
        return []

# Mutable globals
STOCKS: list[dict]   = []
SYMBOL_MAP: dict     = {}
ALL_SYMBOLS: list    = []

def _init_stocks():
    global STOCKS, SYMBOL_MAP, ALL_SYMBOLS
    live = _load_nifty50_from_nse()
    raw  = live if live else [dict(s, region="INDIA") for s in FALLBACK_STOCKS]
    STOCKS      = raw
    SYMBOL_MAP  = {s["symbol"]: s for s in STOCKS}
    ALL_SYMBOLS = [s["symbol"] for s in STOCKS]
    print(f"🇮🇳 Tracking {len(STOCKS)} NSE stocks")

_init_stocks()

INDEX_SYMBOLS = {
    "^NSEI":    "NIFTY 50",
    "^NSEBANK": "Bank NIFTY",
    "^BSESN":   "SENSEX",
}

# ─── Helpers ──────────────────────────────────────────────────────────────────
def _safe_float(val) -> Optional[float]:
    """Safely convert any value (including pandas Series) to float or None."""
    if val is None:
        return None
    # Unwrap a single-element Series
    if isinstance(val, pd.Series):
        if val.empty:
            return None
        val = val.iloc[0]
    try:
        f = float(val)
        return None if pd.isna(f) else f
    except (TypeError, ValueError):
        return None

# ─── Batch quotes ─────────────────────────────────────────────────────────────
def _fetch_quotes_batch(symbols: list) -> dict:
    if not symbols:
        return {}
    try:
        tickers = yf.Tickers(" ".join(symbols))
        result  = {}
        for sym in symbols:
            try:
                inf = tickers.tickers[sym].info  # plain dict

                def gi(*keys):
                    for k in keys:
                        v = _safe_float(inf.get(k))
                        if v is not None:
                            return v
                    return None

                price = gi("currentPrice", "regularMarketPrice", "navPrice")
                if not price:
                    continue
                prev  = gi("previousClose", "regularMarketPreviousClose")
                chg   = round(price - prev, 2)       if price and prev else None
                chgp  = round(chg / prev * 100, 2)   if chg  and prev else None

                result[sym] = {
                    "symbol":           sym,
                    "name":             inf.get("longName") or inf.get("shortName") or SYMBOL_MAP.get(sym, {}).get("name", sym),
                    "sector":           SYMBOL_MAP.get(sym, {}).get("sector", "Other"),
                    "region":           "INDIA",
                    "price":            round(price, 2),
                    "change":           chg,
                    "changePercent":    chgp,
                    "open":             gi("open", "regularMarketOpen"),
                    "high":             gi("dayHigh", "regularMarketDayHigh"),
                    "low":              gi("dayLow",  "regularMarketDayLow"),
                    "prevClose":        prev,
                    "volume":           gi("volume",  "regularMarketVolume"),
                    "avgVolume":        gi("averageDailyVolume3Month", "averageVolume"),
                    "marketCap":        gi("marketCap"),
                    "peRatio":          gi("trailingPE"),
                    "eps":              gi("trailingEps"),
                    "high52":           gi("fiftyTwoWeekHigh"),
                    "low52":            gi("fiftyTwoWeekLow"),
                    "divYield":         round(inf["dividendYield"] * 100, 2) if inf.get("dividendYield") else None,
                    "beta":             gi("beta"),
                    "currency":         inf.get("currency", "INR"),
                    "exchange":         inf.get("exchange", "NSE"),
                    "marketState":      inf.get("marketState", "CLOSED"),
                    "fiftyDayAvg":      gi("fiftyDayAverage"),
                    "twoHundredDayAvg": gi("twoHundredDayAverage"),
                    "source":           "yfinance",
                    "timestamp":        int(time.time() * 1000),
                }
            except Exception as e:
                print(f"  ⚠  {sym}: {e}")
        return result
    except Exception as e:
        print(f"❌ Batch fetch error: {e}")
        return {}

# ─── History — FIXED for new yfinance MultiIndex columns ─────────────────────
def _fetch_history(symbol: str, period: str = "3mo") -> list:
    period_map = {
        "1wk": ("7d",  "1d"),
        "1mo": ("1mo", "1d"),
        "3mo": ("3mo", "1d"),
        "6mo": ("6mo", "1d"),
        "1y":  ("1y",  "1d"),
        "2y":  ("2y",  "1wk"),
        "5y":  ("5y",  "1wk"),
    }
    yf_period, interval = period_map.get(period, ("3mo", "1d"))

    try:
        df = yf.download(
            symbol,
            period=yf_period,
            interval=interval,
            progress=False,
            auto_adjust=True,
            actions=False,
            group_by="column",   # ensure consistent column layout
        )

        if df is None or df.empty:
            return []

        # yfinance ≥0.2.38 returns MultiIndex columns (Price, Ticker) — flatten
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        rows = []
        for ts, row in df.iterrows():
            date_str = ts.strftime("%Y-%m-%d") if hasattr(ts, "strftime") else str(ts)[:10]
            close    = _safe_float(row.get("Close"))
            if close is None:
                continue
            rows.append({
                "date":   date_str,
                "open":   _safe_float(row.get("Open")),
                "high":   _safe_float(row.get("High")),
                "low":    _safe_float(row.get("Low")),
                "close":  round(close, 2),
                "volume": _safe_float(row.get("Volume")),
            })
        return rows

    except Exception as e:
        print(f"❌ History error for {symbol}: {e}")
        return []

# ─── Index quote ──────────────────────────────────────────────────────────────
def _fetch_index_quote(symbol: str) -> Optional[dict]:
    try:
        inf = yf.Ticker(symbol).info
        def gi(*keys):
            for k in keys:
                v = _safe_float(inf.get(k))
                if v is not None: return v
            return None
        price = gi("regularMarketPrice", "currentPrice", "previousClose")
        if not price: return None
        prev  = gi("previousClose", "regularMarketPreviousClose")
        chg   = round(price - prev, 2)     if prev else None
        chgp  = round(chg/prev*100, 2)     if chg and prev else None
        return {"symbol": symbol, "price": round(price, 2), "change": chg,
                "changePercent": chgp, "open": gi("open"), "high": gi("dayHigh"),
                "low": gi("dayLow"), "prevClose": prev, "currency": "INR"}
    except Exception as e:
        print(f"⚠  Index {symbol}: {e}")
        return None

# ─── Technicals ───────────────────────────────────────────────────────────────
def calc_technicals(history: list) -> dict:
    if not history or len(history) < 5:
        return {}
    closes = [r["close"] for r in history if r.get("close")]
    n = len(closes)

    def sma(arr, p):
        return round(sum(arr[-p:]) / p, 2) if len(arr) >= p else None
    def ema(arr, p):
        if len(arr) < p: return None
        k, v = 2/(p+1), sum(arr[:p])/p
        for x in arr[p:]: v = x*k + v*(1-k)
        return round(v, 2)

    sma20, sma50, sma200 = sma(closes,20), sma(closes,min(50,n)), sma(closes,min(200,n))
    ema12, ema26 = ema(closes,12), ema(closes,26)
    macd = round(ema12-ema26, 2) if ema12 and ema26 else None

    rsi_p = min(14, n-1)
    g = l = 0.0
    for i in range(n-rsi_p, n):
        d = closes[i] - closes[i-1]
        if d > 0: g += d
        else:     l -= d
    rsi = round(100-100/(1+g/l), 1) if l else 100.0

    bb_arr = closes[-min(20,n):]
    bb_m   = sum(bb_arr)/len(bb_arr)
    bb_s   = (sum((x-bb_m)**2 for x in bb_arr)/len(bb_arr))**0.5

    atr_p, atr_s = min(14, len(history)-1), 0.0
    for i in range(len(history)-atr_p, len(history)):
        p, c = history[i-1], history[i]
        if p.get("close") and c.get("high") and c.get("low"):
            atr_s += max(c["high"]-c["low"], abs(c["high"]-p["close"]), abs(c["low"]-p["close"]))

    cur = closes[-1]
    sigs = []
    if sma20: sigs.append({"name":"SMA 20","signal":"Bullish" if cur>sma20 else "Bearish","detail":f"Price vs SMA20 ₹{sma20}"})
    if sma50: sigs.append({"name":"SMA 50","signal":"Bullish" if cur>sma50 else "Bearish","detail":f"Price vs SMA50 ₹{sma50}"})
    if sma20 and sma50:
        sigs.append({"name":"Golden/Death Cross","signal":"Bullish" if sma20>sma50 else "Bearish","detail":"SMA20>SMA50 uptrend" if sma20>sma50 else "SMA20<SMA50 downtrend"})
    sigs.append({"name":"RSI","signal":"Oversold" if rsi<30 else "Overbought" if rsi>70 else "Neutral","detail":f"RSI {rsi}"})
    if macd: sigs.append({"name":"MACD","signal":"Bullish" if macd>0 else "Bearish","detail":f"MACD {macd}"})
    sigs.append({"name":"Bollinger Bands","signal":"Oversold" if cur<bb_m-2*bb_s else "Overbought" if cur>bb_m+2*bb_s else "Neutral","detail":"Bollinger position"})

    bull = sum(1 for s in sigs if s["signal"] in ("Bullish","Oversold"))
    bear = sum(1 for s in sigs if s["signal"] in ("Bearish","Overbought"))
    return {
        "sma20":sma20,"sma50":sma50,"sma200":sma200,"ema12":ema12,"ema26":ema26,"macd":macd,"rsi":rsi,
        "bbUpper":round(bb_m+2*bb_s,2),"bbLower":round(bb_m-2*bb_s,2),"bbMiddle":round(bb_m,2),
        "atr":round(atr_s/atr_p,2) if atr_p else None,
        "signals":sigs,
        "overallSignal":"BUY" if bull>bear else "SELL" if bear>bull else "HOLD",
        "bullCount":bull,"bearCount":bear,
    }

# ─── Sentiment ────────────────────────────────────────────────────────────────
POS = ["surge","soar","gain","beat","record","growth","profit","upgrade","bullish","rally","strong","dividend","expand","outperform","exceed","partnership","launch"]
NEG = ["fall","drop","miss","decline","loss","bearish","downgrade","concern","warning","risk","weak","cut","fraud","layoff","disappoint","slump","crash","probe","penalty"]

def sentiment(text: str) -> dict:
    t = (text or "").lower()
    p = sum(1 for w in POS if w in t)
    n = sum(1 for w in NEG if w in t)
    if p > n: return {"label":"Positive","score":min(1.0,0.5+(p-n)*0.1)}
    if n > p: return {"label":"Negative","score":max(0.0,0.5-(n-p)*0.1)}
    return {"label":"Neutral","score":0.5}

def mock_news(stock: dict) -> list:
    name = stock.get("name", stock.get("symbol",""))
    now  = datetime.utcnow()
    return [
        {"id":"m0","title":f"{name} Posts Strong Quarterly Results","source":"Economic Times","isMock":True,"sentiment":{"label":"Positive","score":0.8},"url":"#","publishedAt":(now-timedelta(hours=3)).isoformat()},
        {"id":"m1","title":f"Analysts Upgrade {name} Target Price","source":"Moneycontrol","isMock":True,"sentiment":{"label":"Positive","score":0.75},"url":"#","publishedAt":(now-timedelta(hours=10)).isoformat()},
        {"id":"m2","title":f"{name} Faces Regulatory Headwinds","source":"Business Standard","isMock":True,"sentiment":{"label":"Negative","score":0.3},"url":"#","publishedAt":(now-timedelta(hours=18)).isoformat()},
        {"id":"m3","title":f"{name} Management Outlines 5-Year Growth Roadmap","source":"Livemint","isMock":True,"sentiment":{"label":"Positive","score":0.65},"url":"#","publishedAt":(now-timedelta(hours=28)).isoformat()},
        {"id":"m4","title":f"FII Selling Weighs on {name}","source":"NDTV Profit","isMock":True,"sentiment":{"label":"Negative","score":0.4},"url":"#","publishedAt":(now-timedelta(hours=40)).isoformat()},
    ]

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/api/stocks")
async def get_stocks():
    return STOCKS

@app.post("/api/stocks/refresh")
async def refresh_stocks():
    _init_stocks()
    cache.clear()
    return {"message": f"Refreshed — tracking {len(STOCKS)} stocks", "count": len(STOCKS)}

@app.get("/api/quote/{symbol:path}")
async def get_quote(symbol: str):
    hit = cache.get(f"q:{symbol}")
    if hit: return hit
    data = await rate_limited(_fetch_quotes_batch, [symbol])
    q = data.get(symbol)
    if not q: raise HTTPException(404, f"No data for {symbol}")
    cache.set(f"q:{symbol}", q, 90)
    return q

class BatchReq(BaseModel):
    symbols: list[str]

@app.post("/api/quotes")
async def get_quotes(req: BatchReq):
    symbols  = req.symbols or ALL_SYMBOLS
    result   = {}
    uncached = []
    for s in symbols:
        hit = cache.get(f"q:{s}")
        if hit: result[s] = hit
        else:   uncached.append(s)
    if uncached:
        print(f"📊 Fetching {len(uncached)} quotes via yfinance...")
        fetched = await rate_limited(_fetch_quotes_batch, uncached)
        for s, q in fetched.items():
            cache.set(f"q:{s}", q, 90)
            result[s] = q
    return result

@app.get("/api/history/{symbol:path}")
async def get_history(symbol: str, period: str = "3mo"):
    key = f"h:{symbol}:{period}"
    hit = cache.get(key)
    if hit: return hit
    data = await rate_limited(_fetch_history, symbol, period)
    if not data: raise HTTPException(404, f"No history for {symbol}")
    cache.set(key, data, 600)
    return data

@app.get("/api/technicals/{symbol:path}")
async def get_technicals(symbol: str, period: str = "6mo"):
    key = f"t:{symbol}:{period}"
    hit = cache.get(key)
    if hit: return hit
    history = cache.get(f"h:{symbol}:{period}") or await rate_limited(_fetch_history, symbol, period)
    if not history: raise HTTPException(404, f"No history for {symbol}")
    cache.set(f"h:{symbol}:{period}", history, 600)
    tech = calc_technicals(history)
    cache.set(key, tech, 300)
    return tech

@app.get("/api/summary/{symbol:path}")
async def get_summary(symbol: str):
    key = f"s:{symbol}"
    hit = cache.get(key)
    if hit: return hit
    q_data, history = await asyncio.gather(
        rate_limited(_fetch_quotes_batch, [symbol]),
        rate_limited(_fetch_history, symbol, "6mo"),
    )
    q = q_data.get(symbol)
    if not q: raise HTTPException(404, f"No data for {symbol}")
    cache.set(f"q:{symbol}", q, 90)
    if history: cache.set(f"h:{symbol}:6mo", history, 600)
    payload = {
        "quote":         q,
        "technicals":    calc_technicals(history) if history else {},
        "fundamentals":  {k: q.get(k) for k in ["peRatio","eps","divYield","beta","high52","low52","marketCap","fiftyDayAvg","twoHundredDayAvg"]},
        "historyLength": len(history),
    }
    cache.set(key, payload, 300)
    return payload

@app.get("/api/news/{symbol:path}")
async def get_news(symbol: str):
    key = f"n:{symbol}"
    hit = cache.get(key)
    if hit: return hit
    stock = SYMBOL_MAP.get(symbol, {"symbol": symbol, "name": symbol})
    try:
        raw = await asyncio.get_event_loop().run_in_executor(None, lambda: yf.Ticker(symbol).news)
        if raw:
            articles = []
            for a in raw[:10]:
                ct    = a.get("content", {})
                title = ct.get("title") or a.get("title","")
                desc  = ct.get("summary") or a.get("summary","") or title
                pub   = ct.get("pubDate") or a.get("providerPublishTime")
                if isinstance(pub, (int,float)):
                    pub = datetime.utcfromtimestamp(pub).isoformat()
                articles.append({
                    "id": str(a.get("id","")), "title": title, "description": desc,
                    "url": ct.get("canonicalUrl",{}).get("url") or a.get("link","#"),
                    "source": ct.get("provider",{}).get("displayName") or a.get("publisher","Yahoo Finance"),
                    "publishedAt": pub, "urlToImage": None,
                    "sentiment": sentiment(title+" "+desc), "isMock": False,
                })
            if articles:
                cache.set(key, articles, 900)
                return articles
    except Exception as e:
        print(f"⚠  News error for {symbol}: {e}")
    articles = mock_news(stock)
    cache.set(key, articles, 900)
    return articles

@app.get("/api/market/overview")
async def get_market_overview():
    hit = cache.get("market")
    if hit: return hit
    result = []
    for sym, name in INDEX_SYMBOLS.items():
        q = await rate_limited(_fetch_index_quote, sym)
        if q: result.append({"symbol":sym,"name":name,"region":"INDIA","quote":q})
        await asyncio.sleep(0.3)
    if result: cache.set("market", result, 300)
    return result

@app.get("/api/search")
async def search(q: str = ""):
    if not q: return []
    ql = q.lower()
    return [s for s in STOCKS if ql in s["symbol"].lower() or ql in s["name"].lower() or ql in s.get("sector","").lower()][:10]

@app.get("/api/strategies/rank")
async def rank(strategy: str = "momentum", limit: int = 15):
    uncached = [s for s in ALL_SYMBOLS if not cache.get(f"q:{s}")]
    if uncached:
        fetched = await rate_limited(_fetch_quotes_batch, uncached)
        for sym, q in fetched.items():
            cache.set(f"q:{sym}", q, 90)
    rows = []
    for s in STOCKS:
        q = cache.get(f"q:{s['symbol']}")
        if q: rows.append({**s, **q})
    if strategy == "value":
        ranked = sorted([r for r in rows if (r.get("peRatio") or 0) > 0], key=lambda x: x.get("peRatio",999))
    elif strategy == "volume":
        ranked = sorted(rows, key=lambda x: x.get("volume") or 0, reverse=True)
    elif strategy == "losers":
        ranked = sorted(rows, key=lambda x: x.get("changePercent") or 0)
    else:
        ranked = sorted(rows, key=lambda x: x.get("changePercent") or 0, reverse=True)
    return ranked[:limit]

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "provider": "yfinance (NSE India — free, no key needed)",
        "stocks": len(STOCKS),
        "source": "NSE API (live NIFTY 50)" if len(STOCKS) >= 48 else "Fallback list",
        "cache": cache.stats(),
    }

if __name__ == "__main__":
    import uvicorn
    print(f"\n🚀 StockPulse India  →  http://localhost:5001")
    print(f"🇮🇳 Tracking {len(STOCKS)} NSE stocks  |  yfinance · no API key\n")
    uvicorn.run("main:app", host="0.0.0.0", port=5001, reload=True)
