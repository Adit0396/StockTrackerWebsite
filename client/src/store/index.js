// store/index.js
import { configureStore, createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../utils/api";

// ─── Auth slice ───────────────────────────────────────────────────────────────
const savedToken = localStorage.getItem("sp_token");
const savedUser  = JSON.parse(localStorage.getItem("sp_user") || "null");

const authSlice = createSlice({
  name: "auth",
  initialState: { token: savedToken, user: savedUser, loading: false, error: null },
  reducers: {
    setAuth: (state, action) => {
      state.token = action.payload.token;
      state.user  = action.payload.user;
      state.error = null;
      localStorage.setItem("sp_token", action.payload.token);
      localStorage.setItem("sp_user",  JSON.stringify(action.payload.user));
    },
    logout: (state) => {
      state.token = null;
      state.user  = null;
      localStorage.removeItem("sp_token");
      localStorage.removeItem("sp_user");
    },
    setAuthError: (state, action) => { state.error = action.payload; state.loading = false; },
    setAuthLoading: (state, action) => { state.loading = action.payload; },
  },
});

// ─── Stocks slice ─────────────────────────────────────────────────────────────
export const fetchAllData = createAsyncThunk("stocks/fetchAll", async (_, { getState }) => {
  const stocks = await api.getAllStocks();
  const symbols = stocks.map(s => s.symbol);
  const quotes  = await api.getBatchQuotes(symbols);
  return { stocks, quotes };
});

export const refreshQuotes = createAsyncThunk("stocks/refreshQuotes", async (symbols) => {
  const quotes = await api.getBatchQuotes(symbols);
  return quotes;
});

export const fetchHistory = createAsyncThunk("stocks/fetchHistory", async ({ symbol, period }) => {
  const data = await api.getHistory(symbol, period);
  return { symbol, period, data };
});

export const fetchMarketOverview = createAsyncThunk("stocks/fetchMarket", async () => {
  return await api.getMarketOverview();
});

export const fetchSummary = createAsyncThunk("stocks/fetchSummary", async (symbol) => {
  const data = await api.getSummary(symbol);
  return { symbol, data };
});

export const fetchNews = createAsyncThunk("stocks/fetchNews", async (symbol) => {
  const data = await api.getNews(symbol);
  return { symbol, data };
});

const stocksSlice = createSlice({
  name: "stocks",
  initialState: {
    list:          [],      // NIFTY 50 metadata
    quotes:        {},      // symbol → quote object
    history:       {},      // "SYMBOL:period" → array
    summaries:     {},      // symbol → summary
    news:          {},      // symbol → articles
    marketOverview:[],
    loading:       true,
    quotesLoading: false,
    loadingMsg:    "Connecting to NSE…",
    error:         null,
    lastUpdated:   null,
  },
  reducers: {
    setLoadingMsg: (state, action) => { state.loadingMsg = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      // fetchAllData
      .addCase(fetchAllData.pending, (state) => { state.loading = true; state.loadingMsg = "Fetching live NSE prices…"; })
      .addCase(fetchAllData.fulfilled, (state, action) => {
        state.list        = action.payload.stocks;
        state.quotes      = { ...state.quotes, ...action.payload.quotes };
        state.loading     = false;
        state.lastUpdated = Date.now();
        state.loadingMsg  = "Ready";
      })
      .addCase(fetchAllData.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.error.message;
      })
      // refreshQuotes
      .addCase(refreshQuotes.pending,   (state) => { state.quotesLoading = true; })
      .addCase(refreshQuotes.fulfilled, (state, action) => {
        state.quotes       = { ...state.quotes, ...action.payload };
        state.quotesLoading = false;
        state.lastUpdated  = Date.now();
      })
      .addCase(refreshQuotes.rejected,  (state) => { state.quotesLoading = false; })
      // fetchHistory
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.history[`${action.payload.symbol}:${action.payload.period}`] = action.payload.data;
      })
      // fetchMarketOverview
      .addCase(fetchMarketOverview.fulfilled, (state, action) => { state.marketOverview = action.payload; })
      // fetchSummary
      .addCase(fetchSummary.fulfilled, (state, action) => {
        const { symbol, data } = action.payload;
        state.summaries[symbol] = data;
        if (data.quote) state.quotes[symbol] = data.quote;
        if (data.technicals) {/* store in summary */}
      })
      // fetchNews
      .addCase(fetchNews.fulfilled, (state, action) => {
        state.news[action.payload.symbol] = action.payload.data;
      });
  },
});

// ─── Watchlist slice ──────────────────────────────────────────────────────────
export const fetchWatchlist = createAsyncThunk("watchlist/fetch", async () => {
  return await api.getWatchlistQuotes();
});

export const addToWatchlist = createAsyncThunk("watchlist/add", async ({ symbol, name, sector }) => {
  await api.addToWatchlist(symbol, name, sector);
  return await api.getWatchlist();
});

export const removeFromWatchlist = createAsyncThunk("watchlist/remove", async (symbol) => {
  await api.removeFromWatchlist(symbol);
  return await api.getWatchlist();
});

const watchlistSlice = createSlice({
  name: "watchlist",
  initialState: { items: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWatchlist.pending,   (state) => { state.loading = true; })
      .addCase(fetchWatchlist.fulfilled, (state, action) => { state.items = action.payload; state.loading = false; })
      .addCase(fetchWatchlist.rejected,  (state) => { state.loading = false; })
      .addCase(addToWatchlist.fulfilled,    (state, action) => { state.items = action.payload; })
      .addCase(removeFromWatchlist.fulfilled,(state, action) => { state.items = action.payload; });
  },
});

// ─── Store ────────────────────────────────────────────────────────────────────
export const store = configureStore({
  reducer: {
    auth:      authSlice.reducer,
    stocks:    stocksSlice.reducer,
    watchlist: watchlistSlice.reducer,
  },
});

export const { setAuth, logout, setAuthError, setAuthLoading } = authSlice.actions;
export const { setLoadingMsg } = stocksSlice.actions;

// Selectors
export const selectStocks      = s => s.stocks.list;
export const selectQuotes      = s => s.stocks.quotes;
export const selectHistory     = (symbol, period) => s => s.stocks.history[`${symbol}:${period}`];
export const selectSummary     = symbol => s => s.stocks.summaries[symbol];
export const selectNews        = symbol => s => s.stocks.news[symbol];
export const selectMarket      = s => s.stocks.marketOverview;
export const selectStocksState = s => s.stocks;
export const selectAuth        = s => s.auth;
export const selectWatchlist   = s => s.watchlist.items;
export const selectIsWatched   = symbol => s => s.watchlist.items.some(i => i.symbol === symbol || i.symbol === symbol+".NS");
