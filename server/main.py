"""
StockPulse India — main.py
FastAPI + yfinance + PostgreSQL auth + JWT
"""

import os, time, asyncio, requests, json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from contextlib import contextmanager

import yfinance as yf
import pandas as pd
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import JWTError, jwt

# ─── Config ───────────────────────────────────────────────────────────────────
SECRET_KEY    = os.getenv("SECRET_KEY", "stockpulse-dev-secret-change-in-prod-2024")
ALGORITHM     = "HS256"
TOKEN_EXPIRE  = 60 * 24 * 7  # 7 days in minutes
DATA_DIR      = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
NSE_UNI_FILE  = DATA_DIR / "nse_universe.json"
DATABASE_URL  = os.getenv("DATABASE_URL", "")

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="StockPulse India")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Auth helpers ─────────────────────────────────────────────────────────────
bearer   = HTTPBearer(auto_error=False)

import bcrypt as _bcrypt_lib

def hash_password(pw: str) -> str:
    return _bcrypt_lib.hashpw(pw.encode("utf-8"), _bcrypt_lib.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try: return _bcrypt_lib.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except: return False

def create_token(user_id: int, email: str) -> str:
    exp = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE)
    return jwt.encode({"sub": str(user_id), "email": email, "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return decode_token(creds.credentials)

def optional_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> Optional[dict]:
    if not creds:
        return None
    try:
        return decode_token(creds.credentials)
    except:
        return None

# ─── PostgreSQL DB ────────────────────────────────────────────────────────────
import psycopg2
import psycopg2.extras

@contextmanager
def get_db():
    # Render provides DATABASE_URL as postgres:// — psycopg2 needs postgresql://
    url = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    conn = psycopg2.connect(url)
    conn.autocommit = False
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def db_fetchone(cursor, query, params=()):
    cursor.execute(query, params)
    row = cursor.fetchone()
    if row is None: return None
    cols = [d[0] for d in cursor.description]
    return dict(zip(cols, row))

def db_fetchall(cursor, query, params=()):
    cursor.execute(query, params)
    rows = cursor.fetchall()
    cols = [d[0] for d in cursor.description]
    return [dict(zip(cols, r)) for r in rows]

def init_db():
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id         SERIAL PRIMARY KEY,
                email      TEXT UNIQUE NOT NULL,
                password   TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                last_login TIMESTAMP
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS watchlist (
                id         SERIAL PRIMARY KEY,
                user_id    INTEGER NOT NULL REFERENCES users(id),
                symbol     TEXT NOT NULL,
                name       TEXT,
                sector     TEXT,
                added_at   TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, symbol)
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id)")
    print("✅ PostgreSQL ready")

init_db()

# ─── TTL Cache ────────────────────────────────────────────────────────────────
class TTLCache:
    def __init__(self):
        self._s: dict = {}
    def get(self, key: str):
        e = self._s.get(key)
        if e and time.time() < e["exp"]: return e["val"]
        if e: del self._s[key]
        return None
    def set(self, key: str, val, ttl: int):
        self._s[key] = {"val": val, "exp": time.time() + ttl}
    def clear(self): self._s.clear()
    def stats(self):
        now = time.time()
        return {"keys": sum(1 for e in self._s.values() if now < e["exp"])}

cache = TTLCache()

# ─── Rate limiter ─────────────────────────────────────────────────────────────
_fetch_lock = asyncio.Lock()
_last_fetch = 0.0

async def rate_limited(fn, *args, **kwargs):
    global _last_fetch
    async with _fetch_lock:
        wait = 0.5 - (time.time() - _last_fetch)
        if wait > 0: await asyncio.sleep(wait)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, lambda: fn(*args, **kwargs))
        _last_fetch = time.time()
        return result

# ─── Sector map ───────────────────────────────────────────────────────────────
SECTOR_MAP = {
    "FINANCIAL SERVICES":"Finance","BANK":"Finance","INSURANCE":"Finance",
    "IT":"Technology","INFORMATION TECHNOLOGY":"Technology",
    "OIL & GAS":"Energy","POWER":"Utilities",
    "FMCG":"Consumer","CONSUMER GOODS":"Consumer","CONSUMER DURABLES":"Consumer",
    "AUTOMOBILE":"Auto","AUTO":"Auto",
    "PHARMA":"Healthcare","HEALTHCARE":"Healthcare",
    "METAL":"Materials","CEMENT":"Materials","CHEMICALS":"Materials",
    "TELECOM":"Telecom","REALTY":"Real Estate",
    "CONSTRUCTION":"Infrastructure","INFRASTRUCTURE":"Infrastructure",
    "DIVERSIFIED":"Conglomerate","SERVICES":"Services",
    "MEDIA":"Media","TEXTILES":"Consumer","AGRICULTURE":"Agriculture",
}
def map_sector(raw: str) -> str:
    if not raw: return "Other"
    u = raw.upper().strip()
    for k, v in SECTOR_MAP.items():
        if k in u: return v
    return raw.title()

# ─── NSE Universe ─────────────────────────────────────────────────────────────
NSE_HEADERS = {
    "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept":"application/json","Accept-Language":"en-US,en;q=0.9","Referer":"https://www.nseindia.com/",
}

FALLBACK_STOCKS = [
    {"symbol":"RELIANCE.NS","name":"Reliance Industries","sector":"Energy"},
    {"symbol":"TCS.NS","name":"Tata Consultancy","sector":"Technology"},
    {"symbol":"HDFCBANK.NS","name":"HDFC Bank","sector":"Finance"},
    {"symbol":"INFY.NS","name":"Infosys","sector":"Technology"},
    {"symbol":"ICICIBANK.NS","name":"ICICI Bank","sector":"Finance"},
    {"symbol":"HINDUNILVR.NS","name":"Hindustan Unilever","sector":"Consumer"},
    {"symbol":"WIPRO.NS","name":"Wipro","sector":"Technology"},
    {"symbol":"BHARTIARTL.NS","name":"Bharti Airtel","sector":"Telecom"},
    {"symbol":"ITC.NS","name":"ITC Limited","sector":"Consumer"},
    {"symbol":"KOTAKBANK.NS","name":"Kotak Mahindra Bank","sector":"Finance"},
    {"symbol":"BAJFINANCE.NS","name":"Bajaj Finance","sector":"Finance"},
    {"symbol":"HCLTECH.NS","name":"HCL Technologies","sector":"Technology"},
    {"symbol":"SBIN.NS","name":"State Bank of India","sector":"Finance"},
    {"symbol":"AXISBANK.NS","name":"Axis Bank","sector":"Finance"},
    {"symbol":"MARUTI.NS","name":"Maruti Suzuki","sector":"Auto"},
    {"symbol":"SUNPHARMA.NS","name":"Sun Pharmaceutical","sector":"Healthcare"},
    {"symbol":"TATAMOTOR.NS","name":"Tata Motors","sector":"Auto"},
    {"symbol":"TITAN.NS","name":"Titan Company","sector":"Consumer"},
    {"symbol":"NESTLEIND.NS","name":"Nestle India","sector":"Consumer"},
    {"symbol":"POWERGRID.NS","name":"Power Grid Corp","sector":"Utilities"},
    {"symbol":"NTPC.NS","name":"NTPC Limited","sector":"Utilities"},
    {"symbol":"ONGC.NS","name":"Oil & Natural Gas","sector":"Energy"},
    {"symbol":"TATASTEEL.NS","name":"Tata Steel","sector":"Materials"},
    {"symbol":"JSWSTEEL.NS","name":"JSW Steel","sector":"Materials"},
    {"symbol":"ASIANPAINT.NS","name":"Asian Paints","sector":"Materials"},
    {"symbol":"ULTRACEMCO.NS","name":"UltraTech Cement","sector":"Materials"},
    {"symbol":"BAJAJFINSV.NS","name":"Bajaj Finserv","sector":"Finance"},
    {"symbol":"DMART.NS","name":"Avenue Supermarts","sector":"Retail"},
    {"symbol":"ADANIENT.NS","name":"Adani Enterprises","sector":"Conglomerate"},
    {"symbol":"M&M.NS","name":"Mahindra & Mahindra","sector":"Auto"},
    {"symbol":"LTIM.NS","name":"LTIMindtree","sector":"Technology"},
    {"symbol":"TECHM.NS","name":"Tech Mahindra","sector":"Technology"},
    {"symbol":"COALINDIA.NS","name":"Coal India","sector":"Energy"},
    {"symbol":"BPCL.NS","name":"BPCL","sector":"Energy"},
    {"symbol":"HINDALCO.NS","name":"Hindalco Industries","sector":"Materials"},
    {"symbol":"CIPLA.NS","name":"Cipla","sector":"Healthcare"},
    {"symbol":"DRREDDY.NS","name":"Dr Reddy's Labs","sector":"Healthcare"},
    {"symbol":"APOLLOHOSP.NS","name":"Apollo Hospitals","sector":"Healthcare"},
    {"symbol":"EICHERMOT.NS","name":"Eicher Motors","sector":"Auto"},
    {"symbol":"SHRIRAMFIN.NS","name":"Shriram Finance","sector":"Finance"},
    {"symbol":"DIVISLAB.NS","name":"Divi's Laboratories","sector":"Healthcare"},
    {"symbol":"HEROMOTOCO.NS","name":"Hero MotoCorp","sector":"Auto"},
    {"symbol":"GRASIM.NS","name":"Grasim Industries","sector":"Materials"},
    {"symbol":"SBILIFE.NS","name":"SBI Life Insurance","sector":"Finance"},
    {"symbol":"HDFCLIFE.NS","name":"HDFC Life Insurance","sector":"Finance"},
    {"symbol":"INDUSINDBK.NS","name":"IndusInd Bank","sector":"Finance"},
    {"symbol":"TRENT.NS","name":"Trent","sector":"Retail"},
    {"symbol":"BEL.NS","name":"Bharat Electronics","sector":"Infrastructure"},
    {"symbol":"BRITANNIA.NS","name":"Britannia Industries","sector":"Consumer"},
    {"symbol":"BAJAJ-AUTO.NS","name":"Bajaj Auto","sector":"Auto"},
]

STOCKS: list[dict]   = []
SYMBOL_MAP: dict     = {}
ALL_SYMBOLS: list    = []
NSE_UNIVERSE: list   = []
NSE_UNI_IDX: dict    = {}

def _load_nifty50() -> list:
    try:
        s = requests.Session()
        s.get("https://www.nseindia.com", headers=NSE_HEADERS, timeout=10)
        time.sleep(1.5)
        r = s.get("https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050", headers=NSE_HEADERS, timeout=15)
        r.raise_for_status()
        stocks = []
        for item in r.json().get("data",[]):
            sym = item.get("symbol","").strip()
            if not sym or sym == "NIFTY 50": continue
            meta = item.get("meta",{}) or {}
            stocks.append({"symbol":sym+".NS","name":meta.get("companyName",sym),"sector":map_sector(meta.get("industry","")),"region":"INDIA"})
        if len(stocks) >= 40:
            print(f"✅ NIFTY 50: {len(stocks)} stocks"); return stocks
    except Exception as e: print(f"⚠️  NIFTY 50 fetch: {e}")
    return []

def _load_nse_universe() -> list:
    # Return cached if fresh
    if NSE_UNI_FILE.exists() and time.time() - NSE_UNI_FILE.stat().st_mtime < 86400:
        data = json.loads(NSE_UNI_FILE.read_text())
        if len(data) > 500: print(f"📂 Universe: {len(data)} stocks (cached)"); return data
    try:
        s = requests.Session()
        s.get("https://www.nseindia.com", headers=NSE_HEADERS, timeout=10)
        time.sleep(1.5)
        r = s.get("https://www.nseindia.com/api/equity-master", headers=NSE_HEADERS, timeout=20)
        r.raise_for_status()
        raw = r.json()
        stocks = [{"symbol":sym+".NS","name":info.get("companyName",sym),"sector":map_sector(info.get("industry","")),"isin":info.get("isinCode","")}
                  for sym,info in raw.items() if info.get("series")=="EQ"]
        if len(stocks)>500:
            NSE_UNI_FILE.write_text(json.dumps(stocks,indent=2))
            print(f"✅ Universe: {len(stocks)} stocks"); return stocks
    except Exception as e: print(f"⚠️  Universe fetch: {e}")
    return []

def _init_stocks():
    global STOCKS,SYMBOL_MAP,ALL_SYMBOLS,NSE_UNIVERSE,NSE_UNI_IDX
    live = _load_nifty50()
    STOCKS      = live if live else [dict(s,region="INDIA") for s in FALLBACK_STOCKS]
    SYMBOL_MAP  = {s["symbol"]:s for s in STOCKS}
    ALL_SYMBOLS = [s["symbol"] for s in STOCKS]
    univ = _load_nse_universe()
    NSE_UNIVERSE = univ if univ else [dict(s,region="INDIA") for s in FALLBACK_STOCKS]
    NSE_UNI_IDX  = {s["symbol"]:s for s in NSE_UNIVERSE}
    for s in STOCKS:
        if s["symbol"] not in NSE_UNI_IDX:
            NSE_UNIVERSE.append(s); NSE_UNI_IDX[s["symbol"]] = s
    print(f"🇮🇳 Dashboard: {len(STOCKS)} | Universe: {len(NSE_UNIVERSE)}")

_init_stocks()

INDEX_SYMBOLS = {"^NSEI":"NIFTY 50","^NSEBANK":"Bank NIFTY","^BSESN":"SENSEX"}

# ─── yfinance helpers ─────────────────────────────────────────────────────────
def _sf(val) -> Optional[float]:
    if val is None: return None
    if isinstance(val, pd.Series): val = val.iloc[0] if not val.empty else None
    try:
        f = float(val); return None if pd.isna(f) else f
    except: return None

def _fetch_quotes_batch(symbols: list) -> dict:
    if not symbols: return {}
    try:
        tickers = yf.Tickers(" ".join(symbols))
        result  = {}
        for sym in symbols:
            try:
                inf = tickers.tickers[sym].info
                def gi(*keys):
                    for k in keys:
                        v = _sf(inf.get(k))
                        if v is not None: return v
                    return None
                price = gi("currentPrice","regularMarketPrice","navPrice")
                if not price: continue
                prev  = gi("previousClose","regularMarketPreviousClose")
                chg   = round(price-prev,2)    if price and prev else None
                chgp  = round(chg/prev*100,2)  if chg   and prev else None
                meta  = SYMBOL_MAP.get(sym) or NSE_UNI_IDX.get(sym) or {}
                result[sym] = {
                    "symbol":sym,
                    "name":inf.get("longName") or inf.get("shortName") or meta.get("name",sym),
                    "sector":meta.get("sector","Other"),"region":"INDIA",
                    "price":round(price,2),"change":chg,"changePercent":chgp,
                    "open":gi("open","regularMarketOpen"),
                    "high":gi("dayHigh","regularMarketDayHigh"),
                    "low":gi("dayLow","regularMarketDayLow"),
                    "prevClose":prev,
                    "volume":gi("volume","regularMarketVolume"),
                    "avgVolume":gi("averageDailyVolume3Month","averageVolume"),
                    "marketCap":gi("marketCap"),
                    "peRatio":gi("trailingPE"),
                    "eps":gi("trailingEps"),
                    "high52":gi("fiftyTwoWeekHigh"),
                    "low52":gi("fiftyTwoWeekLow"),
                    "divYield":round(inf["dividendYield"]*100,2) if inf.get("dividendYield") else None,
                    "beta":gi("beta"),
                    "currency":inf.get("currency","INR"),
                    "exchange":inf.get("exchange","NSE"),
                    "marketState":inf.get("marketState","CLOSED"),
                    "fiftyDayAvg":gi("fiftyDayAverage"),
                    "twoHundredDayAvg":gi("twoHundredDayAverage"),
                    # Full fundamentals embedded in quote
                    "pbRatio":gi("priceToBook"),
                    "pegRatio":gi("pegRatio","trailingPegRatio"),
                    "returnOnEquity":gi("returnOnEquity"),
                    "returnOnAssets":gi("returnOnAssets"),
                    "grossMargins":gi("grossMargins"),
                    "operatingMargins":gi("operatingMargins"),
                    "profitMargins":gi("profitMargins"),
                    "revenueGrowth":gi("revenueGrowth"),
                    "earningsGrowth":gi("earningsGrowth"),
                    "debtToEquity":gi("debtToEquity"),
                    "currentRatio":gi("currentRatio"),
                    "quickRatio":gi("quickRatio"),
                    "totalRevenue":gi("totalRevenue"),
                    "ebitda":gi("ebitda"),
                    "freeCashflow":gi("freeCashflow"),
                    "source":"yfinance","timestamp":int(time.time()*1000),
                }
            except Exception as e:
                print(f"  ⚠  {sym}: {e}")
        return result
    except Exception as e:
        print(f"❌ Batch fetch: {e}"); return {}

def _fetch_history(symbol: str, period: str = "3mo") -> list:
    pm = {"1wk":"7d","1mo":"1mo","3mo":"3mo","6mo":"6mo","1y":"1y","2y":"2y","5y":"5y"}
    im = {"1wk":"1d","1mo":"1d","3mo":"1d","6mo":"1d","1y":"1d","2y":"1wk","5y":"1wk"}
    try:
        df = yf.Ticker(symbol).history(period=pm.get(period,"3mo"),interval=im.get(period,"1d"),auto_adjust=True,actions=False)
        if df is None or df.empty: return []
        if isinstance(df.columns,pd.MultiIndex): df.columns = df.columns.get_level_values(0)
        rows = []
        for ts,row in df.iterrows():
            c = _sf(row.get("Close"))
            if c is None: continue
            rows.append({"date":ts.strftime("%Y-%m-%d"),"open":_sf(row.get("Open")),"high":_sf(row.get("High")),"low":_sf(row.get("Low")),"close":round(c,2),"volume":_sf(row.get("Volume"))})
        return rows
    except Exception as e:
        print(f"❌ History {symbol}: {e}"); return []

def _fetch_index_quote(symbol: str) -> Optional[dict]:
    try:
        inf = yf.Ticker(symbol).info
        def gi(*keys):
            for k in keys:
                v = _sf(inf.get(k))
                if v is not None: return v
            return None
        price = gi("regularMarketPrice","currentPrice","previousClose")
        if not price: return None
        prev  = gi("previousClose","regularMarketPreviousClose")
        chg   = round(price-prev,2)   if prev else None
        chgp  = round(chg/prev*100,2) if chg and prev else None
        return {"symbol":symbol,"price":round(price,2),"change":chg,"changePercent":chgp,
                "open":gi("open"),"high":gi("dayHigh"),"low":gi("dayLow"),"prevClose":prev,"currency":"INR"}
    except Exception as e:
        print(f"⚠  Index {symbol}: {e}"); return None

# ─── Technicals ───────────────────────────────────────────────────────────────
def calc_technicals(history: list) -> dict:
    if not history or len(history)<5: return {}
    closes=[r["close"] for r in history if r.get("close")]; n=len(closes)
    def sma(a,p): return round(sum(a[-p:])/p,2) if len(a)>=p else None
    def ema(a,p):
        if len(a)<p: return None
        k,v=2/(p+1),sum(a[:p])/p
        for x in a[p:]: v=x*k+v*(1-k)
        return round(v,2)
    s20,s50,s200=sma(closes,20),sma(closes,min(50,n)),sma(closes,min(200,n))
    e12,e26=ema(closes,12),ema(closes,26)
    macd=round(e12-e26,2) if e12 and e26 else None
    rp=min(14,n-1); g=l=0.0
    for i in range(n-rp,n):
        d=closes[i]-closes[i-1]
        if d>0: g+=d
        else: l-=d
    rsi=round(100-100/(1+g/l),1) if l else 100.0
    bb=closes[-min(20,n):]; bm=sum(bb)/len(bb); bs=(sum((x-bm)**2 for x in bb)/len(bb))**0.5
    ap,as_=min(14,len(history)-1),0.0
    for i in range(len(history)-ap,len(history)):
        p,c=history[i-1],history[i]
        if p.get("close") and c.get("high") and c.get("low"):
            as_+=max(c["high"]-c["low"],abs(c["high"]-p["close"]),abs(c["low"]-p["close"]))
    cur=closes[-1]; sigs=[]
    if s20: sigs.append({"name":"SMA 20","signal":"Bullish" if cur>s20 else "Bearish","detail":f"vs ₹{s20}"})
    if s50: sigs.append({"name":"SMA 50","signal":"Bullish" if cur>s50 else "Bearish","detail":f"vs ₹{s50}"})
    if s20 and s50: sigs.append({"name":"MA Cross","signal":"Bullish" if s20>s50 else "Bearish","detail":"SMA20>50" if s20>s50 else "SMA20<50"})
    sigs.append({"name":"RSI","signal":"Oversold" if rsi<30 else "Overbought" if rsi>70 else "Neutral","detail":f"RSI {rsi}"})
    if macd: sigs.append({"name":"MACD","signal":"Bullish" if macd>0 else "Bearish","detail":f"{macd}"})
    sigs.append({"name":"Bollinger","signal":"Oversold" if cur<bm-2*bs else "Overbought" if cur>bm+2*bs else "Neutral","detail":"Band position"})
    bull=sum(1 for s in sigs if s["signal"] in("Bullish","Oversold"))
    bear=sum(1 for s in sigs if s["signal"] in("Bearish","Overbought"))
    return {"sma20":s20,"sma50":s50,"sma200":s200,"ema12":e12,"ema26":e26,"macd":macd,"rsi":rsi,
            "bbUpper":round(bm+2*bs,2),"bbLower":round(bm-2*bs,2),"bbMiddle":round(bm,2),
            "atr":round(as_/ap,2) if ap else None,"signals":sigs,
            "overallSignal":"BUY" if bull>bear else "SELL" if bear>bull else "HOLD",
            "bullCount":bull,"bearCount":bear}

# ─── Sentiment & News ─────────────────────────────────────────────────────────
POS=["surge","soar","gain","beat","record","growth","profit","upgrade","bullish","rally","strong","dividend","expand","outperform","exceed","partnership","launch","order","acquisition"]
NEG=["fall","drop","miss","decline","loss","bearish","downgrade","concern","warning","risk","weak","cut","fraud","layoff","disappoint","slump","crash","probe","penalty","fine","recall"]

def sentiment(text:str)->dict:
    t=(text or "").lower()
    p=sum(1 for w in POS if w in t); n=sum(1 for w in NEG if w in t)
    if p>n: return{"label":"Positive","score":min(1.0,0.5+(p-n)*0.1)}
    if n>p: return{"label":"Negative","score":max(0.0,0.5-(n-p)*0.1)}
    return{"label":"Neutral","score":0.5}

def mock_news(stock:dict)->list:
    name=stock.get("name",stock.get("symbol","")); now=datetime.utcnow()
    return [
        {"id":"m0","title":f"{name} Posts Strong Quarterly Results, Beats Estimates","description":"The company reported better-than-expected earnings driven by strong revenue growth across segments.","url":"https://economictimes.indiatimes.com/markets/stocks/news","source":"Economic Times","isMock":True,"sentiment":{"label":"Positive","score":0.8},"publishedAt":(now-timedelta(hours=3)).isoformat()},
        {"id":"m1","title":f"Analysts Raise Target Price for {name} After Earnings Beat","description":"Multiple brokerages upgraded their price targets following a strong quarterly performance.","url":"https://www.moneycontrol.com/news/business/stocks/","source":"Moneycontrol","isMock":True,"sentiment":{"label":"Positive","score":0.75},"publishedAt":(now-timedelta(hours=10)).isoformat()},
        {"id":"m2","title":f"{name} Faces Headwinds from Rising Input Costs","description":"Margin pressure expected as raw material prices surge in the near term.","url":"https://www.business-standard.com/markets","source":"Business Standard","isMock":True,"sentiment":{"label":"Negative","score":0.3},"publishedAt":(now-timedelta(hours=18)).isoformat()},
        {"id":"m3","title":f"{name} Outlines Ambitious 5-Year Growth Strategy","description":"Management presented a comprehensive roadmap for expansion into new markets and product lines.","url":"https://www.livemint.com/market","source":"Livemint","isMock":True,"sentiment":{"label":"Positive","score":0.65},"publishedAt":(now-timedelta(hours=28)).isoformat()},
        {"id":"m4","title":f"FII Net Sellers in {name}; DII Continue Accumulation","description":"Foreign institutional investors remained net sellers while domestic funds increased their positions.","url":"https://www.ndtvprofit.com/","source":"NDTV Profit","isMock":True,"sentiment":{"label":"Negative","score":0.4},"publishedAt":(now-timedelta(hours=40)).isoformat()},
    ]

# ═══════════════════════════════════════════════════════════════════════════════
# AUTH ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

class RegisterReq(BaseModel):
    email:    str
    password: str

class LoginReq(BaseModel):
    email:    str
    password: str

_register_lock = {}

@app.post("/api/auth/register")
async def register(req: RegisterReq):
    email = req.email.strip().lower()
    if "@" not in email or "." not in email:
        raise HTTPException(400, "Invalid email address")
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    with get_db() as conn:
        cur = conn.cursor()
        existing = db_fetchone(cur, "SELECT id FROM users WHERE email=%s", (email,))
        if existing:
            raise HTTPException(400, "Email already registered — please sign in instead")
        try:
            cur.execute("INSERT INTO users (email, password) VALUES (%s, %s)", (email, hash_password(req.password)))
            user = db_fetchone(cur, "SELECT * FROM users WHERE email=%s", (email,))
            token = create_token(user["id"], user["email"])
            return {"token": token, "user": {"id": user["id"], "email": user["email"]}}
        except Exception:
            raise HTTPException(400, "Email already registered — please sign in instead")

@app.post("/api/auth/login")
async def login(req: LoginReq):
    email = req.email.strip().lower()
    with get_db() as conn:
        cur = conn.cursor()
        user = db_fetchone(cur, "SELECT * FROM users WHERE email=%s", (email,))
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(401, "Invalid email or password")
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("UPDATE users SET last_login=NOW() WHERE id=%s", (user["id"],))
    token = create_token(user["id"], user["email"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"]}}

@app.get("/api/auth/me")
async def me(user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.cursor()
        u = db_fetchone(cur, "SELECT id,email,created_at,last_login FROM users WHERE id=%s", (user["sub"],))
    if not u: raise HTTPException(404, "User not found")
    return u

# ═══════════════════════════════════════════════════════════════════════════════
# STOCK ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/stocks")
async def get_stocks():
    return STOCKS

@app.post("/api/stocks/refresh")
async def refresh_stocks():
    _init_stocks(); cache.clear()
    return {"count":len(STOCKS)}

class BatchReq(BaseModel):
    symbols: list[str]

@app.post("/api/quotes")
async def get_quotes(req: BatchReq):
    symbols=req.symbols or ALL_SYMBOLS; result={}; uncached=[]
    for s in symbols:
        hit=cache.get(f"q:{s}")
        if hit: result[s]=hit
        else: uncached.append(s)
    if uncached:
        print(f"📊 Fetching {len(uncached)} quotes...")
        fetched=await rate_limited(_fetch_quotes_batch,uncached)
        for s,q in fetched.items(): cache.set(f"q:{s}",q,90); result[s]=q
    return result

@app.get("/api/quote/{symbol:path}")
async def get_quote(symbol:str):
    hit=cache.get(f"q:{symbol}")
    if hit: return hit
    data=await rate_limited(_fetch_quotes_batch,[symbol])
    q=data.get(symbol)
    if not q: raise HTTPException(404,f"No data for {symbol}")
    cache.set(f"q:{symbol}",q,90); return q

@app.get("/api/history/{symbol:path}")
async def get_history(symbol:str,period:str="3mo"):
    key=f"h:{symbol}:{period}"
    hit=cache.get(key)
    if hit: return hit
    data=await rate_limited(_fetch_history,symbol,period)
    if not data: raise HTTPException(404,f"No history for {symbol}")
    cache.set(key,data,600); return data

@app.get("/api/technicals/{symbol:path}")
async def get_technicals(symbol:str,period:str="6mo"):
    key=f"t:{symbol}:{period}"
    hit=cache.get(key)
    if hit: return hit
    hist=cache.get(f"h:{symbol}:{period}") or await rate_limited(_fetch_history,symbol,period)
    if not hist: raise HTTPException(404,f"No history for {symbol}")
    cache.set(f"h:{symbol}:{period}",hist,600)
    tech=calc_technicals(hist); cache.set(key,tech,300); return tech

@app.get("/api/summary/{symbol:path}")
async def get_summary(symbol:str):
    key=f"s:{symbol}"
    hit=cache.get(key)
    if hit: return hit
    qd,hist=await asyncio.gather(rate_limited(_fetch_quotes_batch,[symbol]),rate_limited(_fetch_history,symbol,"6mo"))
    q=qd.get(symbol)
    if not q: raise HTTPException(404,f"No data for {symbol}")
    cache.set(f"q:{symbol}",q,90)
    if hist: cache.set(f"h:{symbol}:6mo",hist,600)
    # Fundamentals pulled directly from quote (all yfinance fields are in there)
    fundamentals = {
        "pbRatio":          q.get("pbRatio"),
        "pegRatio":         q.get("pegRatio"),
        "returnOnEquity":   q.get("returnOnEquity"),
        "returnOnAssets":   q.get("returnOnAssets"),
        "grossMargins":     q.get("grossMargins"),
        "operatingMargins": q.get("operatingMargins"),
        "profitMargins":    q.get("profitMargins"),
        "revenueGrowth":    q.get("revenueGrowth"),
        "earningsGrowth":   q.get("earningsGrowth"),
        "debtToEquity":     q.get("debtToEquity"),
        "currentRatio":     q.get("currentRatio"),
        "quickRatio":       q.get("quickRatio"),
        "totalRevenue":     q.get("totalRevenue"),
        "ebitda":           q.get("ebitda"),
        "freeCashflow":     q.get("freeCashflow"),
        "high52":           q.get("high52"),
        "low52":            q.get("low52"),
        "marketCap":        q.get("marketCap"),
        "fiftyDayAvg":      q.get("fiftyDayAvg"),
        "twoHundredDayAvg": q.get("twoHundredDayAvg"),
    }
    payload={"quote":q,"technicals":calc_technicals(hist) if hist else {},"fundamentals":fundamentals,"historyLength":len(hist)}
    cache.set(key,payload,300); return payload

@app.get("/api/news/{symbol:path}")
async def get_news(symbol:str):
    key=f"n:{symbol}"
    hit=cache.get(key)
    if hit: return hit
    stock=SYMBOL_MAP.get(symbol) or NSE_UNI_IDX.get(symbol) or {"symbol":symbol,"name":symbol}
    try:
        raw=await asyncio.get_event_loop().run_in_executor(None,lambda:yf.Ticker(symbol).news)
        if raw:
            articles=[]
            for a in raw[:12]:
                ct=a.get("content",{}) or {}
                title=ct.get("title") or a.get("title","")
                desc=ct.get("summary") or a.get("summary") or title
                # Get the best URL available
                url=(ct.get("canonicalUrl",{}) or {}).get("url") or \
                    (ct.get("clickThroughUrl",{}) or {}).get("url") or \
                    a.get("link") or a.get("url") or "#"
                pub=ct.get("pubDate") or a.get("providerPublishTime")
                if isinstance(pub,(int,float)): pub=datetime.utcfromtimestamp(pub).isoformat()
                src=((ct.get("provider",{}) or {}).get("displayName")) or a.get("publisher","Yahoo Finance")
                thumb=None
                if a.get("thumbnail"):
                    resolutions = a["thumbnail"].get("resolutions",[])
                    if resolutions: thumb = resolutions[0].get("url")
                articles.append({
                    "id":str(a.get("id","")),
                    "title":title,"description":desc,"url":url,
                    "source":src,"publishedAt":pub,"urlToImage":thumb,
                    "sentiment":sentiment(title+" "+desc),"isMock":False,
                })
            if articles: cache.set(key,articles,900); return articles
    except Exception as e: print(f"⚠  News {symbol}: {e}")
    arts=mock_news(stock); cache.set(key,arts,900); return arts

@app.get("/api/market/overview")
async def get_market_overview():
    hit=cache.get("market")
    if hit: return hit
    result=[]
    for sym,name in INDEX_SYMBOLS.items():
        q=await rate_limited(_fetch_index_quote,sym)
        if q: result.append({"symbol":sym,"name":name,"quote":q})
        await asyncio.sleep(0.3)
    if result: cache.set("market",result,300)
    return result


@app.get("/api/universe")
async def get_universe(sector: str = "All", page: int = 1, page_size: int = 50):
    stocks = NSE_UNIVERSE if sector == "All" else [s for s in NSE_UNIVERSE if s.get("sector") == sector]
    total  = len(stocks)
    start  = (page - 1) * page_size
    page_stocks = stocks[start : start + page_size]
    enriched = []
    for s in page_stocks:
        q = cache.get(f"q:{s['symbol']}")
        entry = dict(s)
        if q:
            entry.update({k: q.get(k) for k in ["price","change","changePercent","marketCap","volume","peRatio","eps","high52","low52"]})
        enriched.append(entry)
    return {"stocks": enriched, "total": total, "page": page, "pageSize": page_size, "pages": -(-total // page_size)}

@app.get("/api/universe/sectors")
async def get_universe_sectors():
    counts = {}
    for s in NSE_UNIVERSE:
        sec = s.get("sector", "Other")
        counts[sec] = counts.get(sec, 0) + 1
    return sorted([{"sector": k, "count": v} for k, v in counts.items()], key=lambda x: -x["count"])

@app.get("/api/search")
async def search(q:str="",limit:int=20):
    if not q: return []
    ql=q.lower().strip()
    a,b,c=[],[],[]
    for s in NSE_UNIVERSE:
        sym=s["symbol"].lower().replace(".ns",""); nm=s["name"].lower()
        if sym.startswith(ql): a.append(s)
        elif nm.startswith(ql): b.append(s)
        elif ql in sym or ql in nm: c.append(s)
    results=(a+b+c)[:limit]
    return [dict(s,price=cache.get(f"q:{s['symbol']}") and cache.get(f"q:{s['symbol']}").get("price"),
                   changePercent=cache.get(f"q:{s['symbol']}") and cache.get(f"q:{s['symbol']}").get("changePercent")) for s in results]

@app.post("/api/screener/quotes")
async def screener_quotes(req: BatchReq):
    symbols=[s if s.endswith(".NS") else s+".NS" for s in req.symbols]
    result={}; uncached=[]
    for s in symbols:
        hit=cache.get(f"q:{s}")
        if hit: result[s]=hit
        else: uncached.append(s)
    if uncached:
        fetched=await rate_limited(_fetch_quotes_batch,uncached)
        for s,q in fetched.items(): cache.set(f"q:{s}",q,90); result[s]=q
    return result

@app.get("/api/strategies/rank")
async def rank(strategy:str="momentum",limit:int=15):
    uncached=[s for s in ALL_SYMBOLS if not cache.get(f"q:{s}")]
    if uncached:
        fetched=await rate_limited(_fetch_quotes_batch,uncached)
        for sym,q in fetched.items(): cache.set(f"q:{sym}",q,90)
    rows=[]
    for s in STOCKS:
        q=cache.get(f"q:{s['symbol']}")
        if q: rows.append({**s,**q})
    if strategy=="value": ranked=sorted([r for r in rows if(r.get("peRatio") or 0)>0],key=lambda x:x.get("peRatio",999))
    elif strategy=="volume": ranked=sorted(rows,key=lambda x:x.get("volume") or 0,reverse=True)
    elif strategy=="losers": ranked=sorted(rows,key=lambda x:x.get("changePercent") or 0)
    else: ranked=sorted(rows,key=lambda x:x.get("changePercent") or 0,reverse=True)
    return ranked[:limit]

# ═══════════════════════════════════════════════════════════════════════════════
# WATCHLIST ROUTES (requires auth)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/watchlist")
async def get_watchlist(user:dict=Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.cursor()
        items = db_fetchall(cur, "SELECT * FROM watchlist WHERE user_id=%s ORDER BY added_at DESC", (user["sub"],))
    for item in items:
        q=cache.get(f"q:{item['symbol']}")
        if q:
            item["price"]         =q.get("price")
            item["change"]        =q.get("change")
            item["changePercent"] =q.get("changePercent")
            item["marketCap"]     =q.get("marketCap")
    return items

class WatchReq(BaseModel):
    symbol: str
    name:   Optional[str]=None
    sector: Optional[str]=None

@app.post("/api/watchlist")
async def add_watchlist(req:WatchReq, user:dict=Depends(get_current_user)):
    sym=req.symbol if req.symbol.endswith(".NS") else req.symbol+".NS"
    meta=SYMBOL_MAP.get(sym) or NSE_UNI_IDX.get(sym) or {}
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO watchlist (user_id,symbol,name,sector) VALUES (%s,%s,%s,%s) ON CONFLICT (user_id,symbol) DO NOTHING",
                (user["sub"],sym,req.name or meta.get("name",sym),req.sector or meta.get("sector","Other"))
            )
    except Exception as e: raise HTTPException(400,str(e))
    return await get_watchlist(user)

class WatchRemoveReq(BaseModel):
    symbol: str

@app.delete("/api/watchlist")
async def remove_watchlist(req:WatchRemoveReq, user:dict=Depends(get_current_user)):
    sym=req.symbol if req.symbol.endswith(".NS") else req.symbol+".NS"
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM watchlist WHERE user_id=%s AND symbol=%s", (user["sub"],sym))
    return await get_watchlist(user)

@app.get("/api/watchlist/quotes")
async def watchlist_live(user:dict=Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.cursor()
        items = db_fetchall(cur, "SELECT * FROM watchlist WHERE user_id=%s ORDER BY added_at DESC", (user["sub"],))
    if not items: return []
    uncached=[i["symbol"] for i in items if not cache.get(f"q:{i['symbol']}")]
    if uncached:
        fetched=await rate_limited(_fetch_quotes_batch,uncached)
        for s,q in fetched.items(): cache.set(f"q:{s}",q,90)
    result=[]
    for item in items:
        q=cache.get(f"q:{item['symbol']}") or {}
        result.append({**item,**q})
    return result

@app.get("/api/health")
async def health():
    return {"status":"ok","timestamp":datetime.utcnow().isoformat(),"provider":"yfinance","nifty50":len(STOCKS),"universe":len(NSE_UNIVERSE),"cache":cache.stats()}

if __name__=="__main__":
    import uvicorn
    print(f"\n🚀 StockPulse India → http://localhost:8000")
    print(f"🇮🇳 {len(STOCKS)} NIFTY 50 | 🔍 {len(NSE_UNIVERSE)} universe | 🔐 PostgreSQL auth\n")
    uvicorn.run("main:app",host="0.0.0.0",port=5001,reload=True)
