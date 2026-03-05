# 📊 StockPulse — Real-time Stock Tracker

A full-stack, production-grade stock tracking dashboard for **Australia (ASX)**, **New Zealand (NZX)**, **India (NSE/BSE)**, and **USA (NYSE/NASDAQ)**.

---

## 🌟 Features

| Feature | Details |
|---|---|
| **Live Quotes** | Real-time prices via Yahoo Finance (no API key needed!) |
| **Historical Charts** | 1W / 1M / 3M / 6M / 1Y / 2Y price charts with volume |
| **Technical Analysis** | RSI, MACD, SMA20/50/200, Bollinger Bands, ATR, VWAP |
| **Fundamentals** | P/E, EPS, Revenue, Margins, Debt/Equity, Analyst targets |
| **Market Heatmap** | Color-coded visual of all stocks by % change |
| **Strategy Ranking** | Momentum, Value, Volume Surge, Top Gainers/Losers |
| **News + Sentiment** | 🟢 Green (Bullish) / 🔴 Red (Bearish) / ⚪ Neutral news cards |
| **Fear & Greed Index** | Sentiment gauge across all tracked stocks |
| **Stock Screener** | Filter by region, sector, P/E, % change, search |
| **Market Overview** | Per-region market summaries with index data |
| **Auto-refresh** | Quotes update every 60 seconds automatically |
| **Search** | Live search across all stocks + Yahoo Finance search |

---

## 📋 Prerequisites

Make sure you have these installed:

```bash
# Check Node.js (need v16+)
node --version

# Check npm
npm --version

# If not installed, download from https://nodejs.org
```

---

## 🚀 Quick Start (5 Minutes)

### Step 1 — Download the project

Save the `stockpulse` folder to your computer, e.g. `~/Desktop/stockpulse`

### Step 2 — Open Terminal / Command Prompt

**Windows:** Press `Win + R`, type `cmd`, press Enter  
**Mac:** Press `Cmd + Space`, type `Terminal`, press Enter  
**Linux:** Press `Ctrl + Alt + T`

### Step 3 — Navigate to the project folder

```bash
cd ~/Desktop/stockpulse
```

### Step 4 — Install dependencies

```bash
# Install root dependencies (concurrently)
npm install

# Install server dependencies
cd server
npm install
cd ..

# Install client dependencies
cd client
npm install
cd ..
```

> ⏱️ This takes 2–3 minutes. You'll see lots of text — that's normal.

### Step 5 — Configure environment (optional but recommended)

```bash
# Copy the example .env file
cd server
cp .env.example .env
```

Open `server/.env` in any text editor (Notepad, VS Code, etc.) and optionally add:

```env
# FREE News API key — get one at https://newsapi.org/register
NEWS_API_KEY=your_key_here

# Everything else works without any API keys!
```

> ✅ **Yahoo Finance data works with NO API KEY needed!**

### Step 6 — Start the app

```bash
# Go back to root folder
cd ~/Desktop/stockpulse

# Start both server and client together
npm run dev
```

You'll see:
```
[server] 🚀 StockPulse Server running on http://localhost:5001
[client] Compiled successfully!
[client] Local: http://localhost:3000
```

### Step 7 — Open in browser

👉 Open **http://localhost:3000** in your browser

---

## 📁 Project Structure

```
stockpulse/
├── package.json              ← Root (runs both server + client)
│
├── server/                   ← Node.js + Express backend
│   ├── index.js              ← Main server file (all API routes)
│   ├── package.json
│   └── .env.example          ← Copy to .env and add your keys
│
└── client/                   ← React frontend
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.js             ← Router setup
    │   ├── App.css            ← Global styles
    │   ├── context/
    │   │   └── StockContext.js ← Global state management
    │   ├── hooks/
    │   │   └── useStockDetail.js
    │   ├── utils/
    │   │   ├── api.js         ← API calls to backend
    │   │   └── format.js      ← Number/currency formatters
    │   ├── components/
    │   │   ├── Header.js      ← Navigation + Search
    │   │   ├── Charts.js      ← Recharts wrappers
    │   │   ├── NewsFeed.js    ← News with sentiment colors
    │   │   └── TechnicalPanel.js ← Technical indicators UI
    │   └── pages/
    │       ├── Dashboard.js   ← Main dashboard
    │       ├── StockDetail.js ← Individual stock view
    │       ├── Screener.js    ← Stock screener table
    │       └── MarketOverview.js ← Market by region
    └── package.json
```

---

## 🔌 API Endpoints

The backend runs on `http://localhost:5001/api/`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stocks` | All tracked stocks (metadata) |
| GET | `/api/quote/:symbol` | Live quote for one stock |
| POST | `/api/quotes` | Batch quotes `{ symbols: [...] }` |
| GET | `/api/history/:symbol?period=3mo` | Price history |
| GET | `/api/technicals/:symbol?period=6mo` | Technical indicators |
| GET | `/api/summary/:symbol` | Quote + technicals + fundamentals |
| GET | `/api/news/:symbol` | News articles with sentiment |
| GET | `/api/market/overview` | Market index data |
| GET | `/api/search?q=query` | Search stocks |
| GET | `/api/strategies/rank?strategy=momentum&regions=AU,USA` | Strategy ranking |
| GET | `/api/health` | Server health check |

**Test the API directly:**
```bash
# Get a live Apple quote
curl http://localhost:5001/api/quote/AAPL

# Get ASX 200 leader CBA
curl http://localhost:5001/api/quote/CBA.AX

# Get NIFTY top stock
curl http://localhost:5001/api/quote/RELIANCE.NS

# Get top momentum stocks
curl "http://localhost:5001/api/strategies/rank?strategy=momentum&regions=AU,USA"
```

---

## 🔑 API Keys

### Yahoo Finance (REQUIRED data) — NO KEY NEEDED ✅
All stock price data comes from Yahoo Finance via the `yahoo-finance2` npm package. No registration required.

### NewsAPI (OPTIONAL — for real news)
Without a key, the app shows realistic mock news.

1. Go to https://newsapi.org/register
2. Sign up for a **free account** (500 requests/day)
3. Copy your API key
4. Add to `server/.env`: `NEWS_API_KEY=your_key_here`
5. Restart the server

### Symbol Reference
| Region | Suffix | Example |
|---|---|---|
| Australia (ASX) | `.AX` | `CBA.AX`, `BHP.AX` |
| New Zealand (NZX) | `.NZ` | `FPH.NZ`, `AIR.NZ` |
| India (NSE) | `.NS` | `TCS.NS`, `INFY.NS` |
| India (BSE) | `.BO` | `RELIANCE.BO` |
| USA | (none) | `AAPL`, `MSFT` |

---

## 🛠 Troubleshooting

**Port already in use?**
```bash
# Kill process on port 5001
npx kill-port 5001
# Kill process on port 3000
npx kill-port 3000
```

**npm install fails?**
```bash
# Clear npm cache and retry
npm cache clean --force
npm install
```

**Yahoo Finance errors?**
- Yahoo Finance occasionally rate-limits. Wait 30 seconds and refresh.
- Data is cached on the server for 60 seconds for quotes, 5 min for history.

**"Cannot find module" error?**
```bash
cd server && npm install
cd ../client && npm install
```

**Windows PowerShell execution policy error?**
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

---

## ⚡ Running Server and Client Separately

If you prefer two terminal windows:

**Terminal 1 — Server:**
```bash
cd stockpulse/server
npm run dev
```

**Terminal 2 — Client:**
```bash
cd stockpulse/client
npm start
```

---

## 🏗 Building for Production

```bash
# Build optimized React app
cd client
npm run build

# The server can then serve the built files
# Add to server/index.js:
# app.use(express.static(path.join(__dirname, '../client/build')));
```

---

## 📈 Adding More Stocks

Edit `server/index.js` and add symbols to the `STOCK_UNIVERSE` object:

```js
AU: [
  { symbol: "NEW.AX", name: "New Company", sector: "Technology" },
  // ...existing stocks
],
```

---

## 🤝 Tech Stack

| Layer | Tech |
|---|---|
| **Frontend** | React 18, React Router 6, Recharts |
| **Backend** | Node.js, Express |
| **Data** | yahoo-finance2 (free, no key needed) |
| **News** | NewsAPI.org (free tier) |
| **Caching** | node-cache (in-memory) |
| **Styling** | Inline CSS + Google Fonts (Syne + JetBrains Mono) |

---

*StockPulse is for informational purposes only. Not financial advice.*
