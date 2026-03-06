# 📊 StockPulse India — Real-time NSE Stock Tracker

A full-stack, production-grade stock tracking dashboard for **India (NSE)** — built with React, FastAPI, and yfinance.

---

## 🌟 Features

| Feature | Details |
|---|---|
| **Live Quotes** | Real-time NSE prices via yfinance (no API key needed) |
| **NIFTY 50 Dashboard** | All 50 stocks with live prices, heatmap, and ticker tape |
| **Full NSE Universe** | 2,600+ NSE-listed companies in the screener |
| **Historical Charts** | 1W / 1M / 3M / 6M / 1Y / 2Y price charts |
| **Technical Analysis** | RSI, MACD, SMA20/50/200, Bollinger Bands, ATR |
| **Fundamentals** | P/E, P/B, ROE, ROA, Revenue, Margins, Debt/Equity |
| **Market Heatmap** | Color-coded visual of all NIFTY 50 stocks by % change |
| **Strategy Ranking** | Momentum, Value, Volume Surge, Top Gainers/Losers |
| **News + Sentiment** | 🟢 Bullish / 🔴 Bearish / ⚪ Neutral news cards |
| **Fear & Greed Index** | Live sentiment gauge across all tracked stocks |
| **Stock Screener** | Filter 2,600+ stocks by sector, price, P/E with pagination |
| **Market Overview** | NIFTY 50, Bank NIFTY, SENSEX index data |
| **User Accounts** | Email/password auth with JWT — watchlist tied to your account |
| **Watchlist** | Save and track your favourite stocks |
| **Auto-refresh** | Quotes update every 90 seconds automatically |

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| **Frontend** | React 18, Redux Toolkit, React Router 6, Recharts |
| **Backend** | Python, FastAPI, uvicorn |
| **Data** | yfinance (free, no API key needed) |
| **Auth** | JWT tokens + bcrypt password hashing |
| **Database** | SQLite (users + watchlist) |
| **Styling** | Inline CSS + Google Fonts (Syne + JetBrains Mono) |

---

## 📋 Prerequisites

```bash
# Python 3.9+
python3 --version

# Node.js 16+
node --version
```

---

## 🚀 Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/your-username/stockpulse.git
cd stockpulse
```

### 2. Start the backend

```bash
cd server
pip install -r requirements.txt
python3 -m uvicorn main:app --reload --port 8000
```

First startup takes ~30–60 seconds — it fetches all 50 NIFTY stocks and 2,600+ NSE listings from NSE's API. You'll see:

```
✅ NIFTY 50: 50 stocks
✅ Universe: 2634 stocks
🚀 StockPulse API → http://localhost:8000
```

### 3. Start the frontend

Open a new terminal tab:

```bash
cd client
npm install
npm start
```

### 4. Open the app

👉 **http://localhost:3000**

---

## 📁 Project Structure

```
stockpulse/
├── .gitignore
├── render.yaml                  ← Render deployment config (both services)
│
├── server/
│   ├── main.py                  ← FastAPI app (all routes + auth + yfinance)
│   ├── requirements.txt
│   └── data/                    ← Auto-created on first run
│       ├── stockpulse.db        ← SQLite (gitignored)
│       └── nse_universe.json    ← NSE universe cache (gitignored)
│
└── client/
    ├── package.json
    ├── public/
    │   ├── index.html
    │   └── _redirects           ← Render SPA routing fix
    └── src/
        ├── index.js             ← React entry point
        ├── App.js               ← Router + Redux Provider + data loader
        ├── App.css              ← Global styles + animations
        ├── store/
        │   └── index.js         ← Redux store (auth, stocks, watchlist)
        ├── utils/
        │   ├── api.js           ← Axios client (auto-injects JWT)
        │   └── format.js        ← INR formatters, % helpers
        ├── components/
        │   ├── Header.js        ← Nav + live search + user menu
        │   ├── Charts.js        ← Recharts wrappers
        │   ├── NewsFeed.js      ← News with sentiment badges
        │   └── TechnicalPanel.js
        └── pages/
            ├── Auth.js          ← Login / Register
            ├── Dashboard.js     ← NIFTY 50 heatmap + strategy ranker
            ├── StockDetail.js   ← Full stock view (chart, technicals, news)
            ├── Screener.js      ← 2,600+ stock screener with pagination
            ├── Watchlist.js     ← User watchlist
            └── MarketOverview.js
```

---

## 🔌 API Endpoints

Backend runs on `http://localhost:8000`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register `{ email, password }` |
| POST | `/api/auth/login` | Login `{ email, password }` |
| GET | `/api/auth/me` | Current user (requires JWT) |
| GET | `/api/stocks` | NIFTY 50 metadata |
| GET | `/api/universe?sector=Finance&page=1` | Full NSE universe (paginated) |
| GET | `/api/universe/sectors` | All sectors with stock counts |
| POST | `/api/quotes` | Batch quotes `{ symbols: [...] }` |
| GET | `/api/quote/:symbol` | Single stock quote |
| GET | `/api/history/:symbol?period=3mo` | Price history |
| GET | `/api/summary/:symbol` | Quote + technicals + fundamentals |
| GET | `/api/news/:symbol` | News with sentiment |
| GET | `/api/market/overview` | NIFTY 50, Bank NIFTY, SENSEX |
| GET | `/api/search?q=query` | Search 2,600+ NSE stocks |
| GET | `/api/strategies/rank?strategy=momentum` | Strategy ranking |
| GET | `/api/watchlist` | User watchlist (requires JWT) |
| POST | `/api/watchlist` | Add to watchlist (requires JWT) |
| DELETE | `/api/watchlist` | Remove from watchlist (requires JWT) |
| GET | `/api/health` | Health check |

**Test the API:**
```bash
curl http://localhost:8000/api/health
curl http://localhost:8000/api/universe/sectors
curl "http://localhost:8000/api/search?q=HDFC"
curl http://localhost:8000/api/quote/RELIANCE.NS
```

---

## ☁️ Deployment (Render)

Both services deploy from the same repo using `render.yaml`.

### 1. Push to GitHub

```bash
git add .
git commit -m "initial commit"
git push origin main
```

### 2. Deploy via Render Blueprint

1. Go to [render.com](https://render.com) → **New** → **Blueprint**
2. Connect your GitHub repo
3. Render reads `render.yaml` and creates two services:
   - `stockpulse-api` — FastAPI backend (Python)
   - `stockpulse-frontend` — React static site

### 3. Add persistent disk (backend)

In Render → `stockpulse-api` → **Disks** → **Add Disk**:
- Mount path: `/data`
- Size: 1 GB

> ⚠️ Without this disk, your SQLite database resets on every redeploy.

### 4. Set environment variables

**Backend** (`stockpulse-api`):
| Variable | Value |
|---|---|
| `SECRET_KEY` | Click "Generate" in Render |
| `ALLOWED_ORIGINS` | `https://stockpulse-frontend.onrender.com` |
| `DATA_DIR` | `/data` |

**Frontend** (`stockpulse-frontend`):
| Variable | Value |
|---|---|
| `REACT_APP_API_URL` | `https://stockpulse-api.onrender.com` |

### 5. Free tier note

Render's free backend sleeps after 15 min of inactivity (~30s cold start to wake). Use [UptimeRobot](https://uptimerobot.com) (free) to ping `/api/health` every 10 minutes to keep it awake, or upgrade to Starter ($7/mo).

---

## 🛠 Troubleshooting

**Backend won't start?**
```bash
# Make sure you're in the server folder
cd server
python3 -m uvicorn main:app --reload --port 8000
```

**"Email already registered" on first register?**
```bash
# Delete the old database and restart
rm server/data/stockpulse.db
```

**Screener shows 404 for /api/universe?**
Make sure you're running the latest `main.py` — the universe endpoints were added recently.

**yfinance rate limited?**
Yahoo Finance occasionally rate-limits. The server caches quotes for 90 seconds — wait a moment and refresh.

**Port already in use?**
```bash
# Find and kill the process on port 8000
lsof -ti:8000 | xargs kill -9
```

---

## .gitignore

Make sure your `.gitignore` includes:

```
server/data/stockpulse.db
server/data/nse_universe.json
__pycache__/
*.pyc
.env
node_modules/
client/build/
.DS_Store
```

---

*StockPulse is for informational purposes only. Not financial advice.*
