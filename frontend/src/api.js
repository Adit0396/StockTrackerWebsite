// frontend/src/api.js
const historyCache = {};
const quoteCache = {};

export const fetchHistory = async (symbol) => {
  symbol = symbol.toUpperCase();

  // Cache for 1 minute
  const cacheKey = symbol;
  if (historyCache[cacheKey] && Date.now() - historyCache[cacheKey].fetchedAt < 60_000) {
    return historyCache[cacheKey].data;
  }

  const res = await fetch(`http://localhost:5001/api/history/${symbol}`);
  const data = await res.json();

  historyCache[cacheKey] = { data, fetchedAt: Date.now() };
  return data;
};

export const fetchQuote = async (symbol) => {
  symbol = symbol.toUpperCase();

  if (quoteCache[symbol] && Date.now() - quoteCache[symbol].fetchedAt < 60_000) {
    return quoteCache[symbol].data;
  }

  const res = await fetch(`http://localhost:5001/api/quote/${symbol}`);
  const data = await res.json();

  quoteCache[symbol] = { data, fetchedAt: Date.now() };
  return data;
};

let newsCache = { timestamp: 0, data: [] };

export const fetchNews = async () => {
  // Use cached news if less than 1 minute old
  if (Date.now() - newsCache.timestamp < 60_000) {
    return newsCache.data;
  }

  try {
    const res = await fetch("http://localhost:5001/api/news");
    const data = await res.json();

    newsCache = { timestamp: Date.now(), data };
    return data;
  } catch (err) {
    console.error("Failed to fetch news:", err);
    return newsCache.data || [];
  }
};


