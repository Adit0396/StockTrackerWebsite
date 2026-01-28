import React, { useEffect, useState } from "react";
import { Card, CardContent, Typography, IconButton, CircularProgress, Box } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import StockChart from "./StockChart";
import { fetchHistory, fetchQuote } from "../api";

const StockCard = ({ symbol, removeStock }) => {
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let mounted = true; // prevent state update if unmounted

    const loadData = async () => {
      setLoading(true);
      try {
        const [q, h] = await Promise.all([fetchQuote(symbol), fetchHistory(symbol)]);
        if (mounted) {
          setQuote(q);
          setHistory(h);
        }
      } catch (err) {
        console.error("Failed to fetch stock data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => { mounted = false; };
  }, [symbol]); // only runs once per symbol

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ textAlign: "center" }}>
          <CircularProgress />
          <Typography variant="body2">Loading {symbol}...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography>No historical data for {symbol}</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">
          {symbol} - ${quote?.price?.toFixed(2)}
          <IconButton
            size="small"
            onClick={() => removeStock(symbol)}
            sx={{ float: "right" }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Typography>
        <Typography variant="body2" color={quote?.change >= 0 ? "green" : "red"}>
          {quote?.change >= 0 ? "+" : ""}
          {quote?.change?.toFixed(2)} ({quote?.changePercent?.toFixed(2)}%)
        </Typography>
        <Box sx={{ mt: 2 }}>
          <StockChart ticker={symbol} history={history} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default StockCard;
