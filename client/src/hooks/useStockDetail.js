import { useState, useEffect, useCallback } from "react";
import api from "../utils/api";

export function useStockDetail(symbol) {
  const [data, setData]       = useState({ summary: null, history: null, news: null, technicals: null });
  const [loading, setLoading] = useState({ summary: false, history: false, news: false });
  const [period, setPeriod]   = useState("3mo");
  const [error, setError]     = useState(null);

  const loadSummary = useCallback(async (sym) => {
    if (!sym) return;
    setLoading((l) => ({ ...l, summary: true }));
    try {
      const summary = await api.getSummary(sym);
      setData((d) => ({ ...d, summary, technicals: summary.technicals }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((l) => ({ ...l, summary: false }));
    }
  }, []);

  const loadHistory = useCallback(async (sym, p) => {
    if (!sym) return;
    setLoading((l) => ({ ...l, history: true }));
    try {
      const history = await api.getHistory(sym, p);
      setData((d) => ({ ...d, history }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((l) => ({ ...l, history: false }));
    }
  }, []);

  const loadNews = useCallback(async (sym) => {
    if (!sym) return;
    setLoading((l) => ({ ...l, news: true }));
    try {
      const news = await api.getNews(sym);
      setData((d) => ({ ...d, news }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((l) => ({ ...l, news: false }));
    }
  }, []);

  // Load everything on mount / symbol change
  useEffect(() => {
    if (!symbol) return;
    setData({ summary: null, history: null, news: null, technicals: null });
    setError(null);
    loadSummary(symbol);
    loadHistory(symbol, period);
    loadNews(symbol);
  }, [symbol]); // eslint-disable-line

  // Reload history when period changes
  useEffect(() => {
    if (symbol) loadHistory(symbol, period);
  }, [symbol, period, loadHistory]);

  return { data, loading, error, period, setPeriod };
}
