// utils/api.js
// Reads backend URL from environment variable.
// On Render static site: set REACT_APP_API_URL in Environment Variables.
// Locally: create client/.env.local with REACT_APP_API_URL=http://localhost:8000
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const API = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 60000,
});

// Auto-inject JWT token on every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("sp_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.detail || err.message;
    console.error("API Error:", msg);
    throw new Error(msg);
  }
);

const api = {
  register:           (email, password)           => API.post("/auth/register", { email, password }),
  login:              (email, password)            => API.post("/auth/login", { email, password }),
  getMe:              ()                           => API.get("/auth/me"),
  getAllStocks:        ()                           => API.get("/stocks"),
  getQuote:           (symbol)                     => API.get(`/quote/${encodeURIComponent(symbol)}`),
  getBatchQuotes:     (symbols)                    => API.post("/quotes", { symbols }),
  getHistory:         (symbol, period = "3mo")     => API.get(`/history/${encodeURIComponent(symbol)}`, { params: { period } }),
  getTechnicals:      (symbol, period = "6mo")     => API.get(`/technicals/${encodeURIComponent(symbol)}`, { params: { period } }),
  getSummary:         (symbol)                     => API.get(`/summary/${encodeURIComponent(symbol)}`),
  getNews:            (symbol)                     => API.get(`/news/${encodeURIComponent(symbol)}`),
  getMarketOverview:  ()                           => API.get("/market/overview"),
  search:             (q, limit = 20)              => API.get("/search", { params: { q, limit } }),
  screenerQuotes:     (symbols)                    => API.post("/screener/quotes", { symbols }),
  getUniverse:        (sector="All", page=1, pageSize=50) => API.get("/universe", { params: { sector, page, page_size: pageSize } }),
  getUniverseSectors: ()                           => API.get("/universe/sectors"),
  getRanked:          (strategy, limit = 15)       => API.get("/strategies/rank", { params: { strategy, limit } }),
  getWatchlist:       ()                           => API.get("/watchlist"),
  getWatchlistQuotes: ()                           => API.get("/watchlist/quotes"),
  addToWatchlist:     (symbol, name, sector)       => API.post("/watchlist", { symbol, name, sector }),
  removeFromWatchlist:(symbol)                     => API.delete("/watchlist", { data: { symbol } }),
  getHealth:          ()                           => API.get("/health"),
};

export default api;
