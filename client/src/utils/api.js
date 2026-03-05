import axios from "axios";

// Longer timeout — yfinance first call can take ~10s to warm up
const API = axios.create({ baseURL: "/api", timeout: 60000 });

API.interceptors.response.use(
  (res) => res.data,
  (err) => {
    console.error("API Error:", err.response?.data || err.message);
    throw err;
  }
);

const api = {
  getAllStocks:     ()                       => API.get("/stocks"),
  getQuote:        (symbol)                 => API.get(`/quote/${encodeURIComponent(symbol)}`),
  getBatchQuotes:  (symbols)                => API.post("/quotes", { symbols }),
  getHistory:      (symbol, period = "3mo") => API.get(`/history/${encodeURIComponent(symbol)}`, { params: { period } }),
  getTechnicals:   (symbol, period = "6mo") => API.get(`/technicals/${encodeURIComponent(symbol)}`, { params: { period } }),
  getSummary:      (symbol)                 => API.get(`/summary/${encodeURIComponent(symbol)}`),
  getNews:         (symbol)                 => API.get(`/news/${encodeURIComponent(symbol)}`),
  getMarketOverview: ()                     => API.get("/market/overview"),
  search:          (q)                      => API.get("/search", { params: { q } }),
  getRanked:       (strategy, limit = 10)   => API.get("/strategies/rank", { params: { strategy, limit } }),
  getHealth:       ()                       => API.get("/health"),
};

export default api;
