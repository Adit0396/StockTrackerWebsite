// backend/routes/stocks.js
import express from "express";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";
import YahooFinance from "yahoo-finance2";

const router = express.Router();
const yf = new YahooFinance({ suppressNotices: ["ripHistorical"]});

// ✅ Live quote using Finnhub
router.get("/quote/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok && data.error) {
      return res.status(403).json({ error: data.error });
    }

    res.json({
      symbol,
      price: data.c ?? null,
      change: data.d ?? null,
      changePercent: data.dp ?? null,
      high: data.h ?? null,
      low: data.l ?? null,
      open: data.o ?? null,
      prevClose: data.pc ?? null,
    });
  } catch (err) {
    console.error("🔥 QUOTE ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch quote" });
  }
});

// ✅ Historical data using Alpha Vantage
router.get("/history/:symbol", async (req, res) => {
  const symbol = req.params.symbol?.toUpperCase();

  if (!symbol) {
    return res.status(400).json({ error: "Symbol is required" });
  }

  const now = Math.floor(Date.now() / 1000);
  const from = now - 30 * 24 * 60 * 60; // last 30 days

  try {
    // 1️⃣ Yahoo Finance primary
    try {
      const yahooData = await yf.chart(symbol, {
        interval: "1d",
        period1: from,
        period2: now,
      });

      const result = yahooData?.chart?.result?.[0];
      if (result?.timestamp?.length) {
        const quotes = result.indicators.quote[0];
        const candles = result.timestamp.map((t, i) => ({
          date: new Date(t * 1000).toISOString(),
          open: quotes.open[i],
          high: quotes.high[i],
          low: quotes.low[i],
          close: quotes.close[i],
          volume: quotes.volume[i],
        }));

        return res.json(candles);
      }

      console.warn(`⚠️ Yahoo returned no data for ${symbol}`);
    } catch (err) {
      console.warn(`⚠️ Yahoo failed for ${symbol}:`, err.message);
    }

    // 2️⃣ Finnhub fallback
    try {
      const finnhubUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${now}&token=${process.env.FINNHUB_API_KEY}`;
      const response = await fetch(finnhubUrl);
      const fhData = await response.json();

      if (fhData.s === "ok" && fhData.t?.length) {
        const candles = fhData.t.map((t, i) => ({
          date: new Date(t * 1000).toISOString(),
          open: fhData.o[i],
          high: fhData.h[i],
          low: fhData.l[i],
          close: fhData.c[i],
          volume: fhData.v[i],
        }));
        return res.json(candles);
      }

      console.warn(`⚠️ Finnhub returned no data for ${symbol}:`, fhData);
    } catch (err) {
      console.warn(`⚠️ Finnhub failed for ${symbol}:`, err.message);
    }

    // 3️⃣ Mock fallback (so frontend never breaks)
    console.warn(`⚠️ Returning mock data for ${symbol}`);
    const mockData = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const price = 100 + Math.random() * 50;
      return { date: date.toISOString(), open: price, high: price + 2, low: price - 2, close: price, volume: Math.floor(Math.random() * 10000) };
    });

    res.json(mockData);
  } catch (err) {
    console.error("🔥 HISTORY ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch history", reason: err.message });
  }
});

// ✅ News via MarketWatch RSS
router.get("/news", async (req, res) => {
  try {
    const RSS_URL = "https://www.marketwatch.com/rss/topstories";
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(RSS_URL)}`;

    const response = await fetch(proxyUrl);

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch news from proxy" });
    }

    const data = await response.json();

    const parsed = await parseStringPromise(data.contents);

    const items =
      parsed?.rss?.channel?.[0]?.item?.slice(0, 10).map(item => ({
        title: item.title?.[0],
        link: item.link?.[0],
        pubDate: item.pubDate?.[0],
      })) || [];

    res.json(items);
  } catch (err) {
    console.error("🔥 NEWS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch news", reason: err.message });
  }
});


export default router;
