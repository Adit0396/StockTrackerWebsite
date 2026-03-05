import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from "react";
import api from "../utils/api";

const StockContext = createContext();

const initialState = {
  stocks:         [],
  quotes:         {},
  marketOverview: [],
  loading:        true,        // initial skeleton load
  quotesLoading:  false,       // background refresh indicator
  loadingMsg:     "Loading NSE stocks…",
  error:          null,
  lastUpdated:    null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_STOCKS":         return { ...state, stocks: action.payload };
    case "SET_QUOTES":         return { ...state, quotes: { ...state.quotes, ...action.payload }, quotesLoading: false, loading: false, lastUpdated: Date.now() };
    case "SET_MARKET":         return { ...state, marketOverview: action.payload };
    case "SET_LOADING":        return { ...state, loading: action.payload };
    case "SET_LOADING_MSG":    return { ...state, loadingMsg: action.payload };
    case "SET_QUOTES_LOADING": return { ...state, quotesLoading: action.payload };
    case "SET_ERROR":          return { ...state, error: action.payload, loading: false };
    default:                   return state;
  }
}

export function StockProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const timerRef = useRef(null);
  const initDone = useRef(false);

  const getEnrichedStocks = useCallback(
    () => state.stocks.map((s) => ({
      ...s,
      ...state.quotes[s.symbol],
      quote: state.quotes[s.symbol] || null,
    })),
    [state.stocks, state.quotes]
  );

  const refreshQuotes = useCallback(async (stocks) => {
    const list = stocks || state.stocks;
    if (!list.length) return;
    dispatch({ type: "SET_QUOTES_LOADING", payload: true });
    try {
      const symbols = list.map((s) => s.symbol);
      const data    = await api.getBatchQuotes(symbols);
      dispatch({ type: "SET_QUOTES", payload: data });
    } catch (err) {
      console.error("Quote refresh failed:", err.message);
      dispatch({ type: "SET_QUOTES_LOADING", payload: false });
    }
  }, [state.stocks]);

  const loadMarketOverview = useCallback(async () => {
    try {
      const data = await api.getMarketOverview();
      dispatch({ type: "SET_MARKET", payload: data });
    } catch (err) {
      console.error("Market overview failed:", err.message);
    }
  }, []);

  // Bootstrap — runs once
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    (async () => {
      dispatch({ type: "SET_LOADING_MSG", payload: "Connecting to NSE data…" });

      // 1. Load metadata (instant)
      let stocks = [];
      try {
        stocks = await api.getAllStocks();
        dispatch({ type: "SET_STOCKS", payload: stocks });
        dispatch({ type: "SET_LOADING_MSG", payload: `Fetching live prices for ${stocks.length} stocks…` });
      } catch (err) {
        dispatch({ type: "SET_ERROR", payload: "Failed to load stock list: " + err.message });
        return;
      }

      // 2. Fetch all quotes (yfinance batches this as one call)
      try {
        await refreshQuotes(stocks);
      } catch (err) {
        dispatch({ type: "SET_ERROR", payload: "Failed to load quotes: " + err.message });
      }

      // 3. Market indices (non-blocking)
      loadMarketOverview();
    })();
  }, []); // eslint-disable-line

  // Auto-refresh every 90s
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (!state.quotesLoading) {
        refreshQuotes();
        loadMarketOverview();
      }
    }, 90_000);
    return () => clearInterval(timerRef.current);
  }, [refreshQuotes, loadMarketOverview, state.quotesLoading]);

  return (
    <StockContext.Provider value={{
      ...state,
      allStocks: state.stocks,   // backward compat
      getEnrichedStocks,
      refreshQuotes,
      loadMarketOverview,
    }}>
      {children}
    </StockContext.Provider>
  );
}

export const useStock = () => useContext(StockContext);
