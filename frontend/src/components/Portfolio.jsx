import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  Button,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { fetchQuote } from "../api";

// Portfolio component
const Portfolio = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [newSymbol, setNewSymbol] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [boughtPrice, setBoughtPrice] = useState(0);
  const [quotes, setQuotes] = useState({});

  // Load from localStorage
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("portfolio") || "[]");
    setPortfolio(stored);
  }, []);

  // Fetch live quotes
  useEffect(() => {
    const loadQuotes = async () => {
      const obj = {};
      for (let stock of portfolio) {
        try {
          const q = await fetchQuote(stock.symbol);
          obj[stock.symbol] = q;
        } catch (err) {
          console.error("Failed to fetch quote for", stock.symbol);
        }
      }
      setQuotes(obj);
    };
    if (portfolio.length) loadQuotes();
  }, [portfolio]);

  const savePortfolio = (updated) => {
    setPortfolio(updated);
    localStorage.setItem("portfolio", JSON.stringify(updated));
  };

  const handleAddStock = () => {
    if (!newSymbol || quantity <= 0 || boughtPrice <= 0) return;

    const exists = portfolio.find((s) => s.symbol === newSymbol.toUpperCase());
    let updated;
    if (exists) {
      updated = portfolio.map((s) =>
        s.symbol === newSymbol.toUpperCase()
          ? {
              ...s,
              quantity: s.quantity + quantity,
              boughtPrice, // overwrite latest
            }
          : s
      );
    } else {
      updated = [
        ...portfolio,
        { symbol: newSymbol.toUpperCase(), quantity, boughtPrice },
      ];
    }
    savePortfolio(updated);
    setNewSymbol("");
    setQuantity(1);
    setBoughtPrice(0);
  };

  const handleRemoveStock = (symbol) => {
    const updated = portfolio.filter((s) => s.symbol !== symbol);
    savePortfolio(updated);
  };

  // Portfolio totals
  const totalValue = portfolio.reduce((sum, s) => {
    const livePrice = quotes[s.symbol]?.price || s.boughtPrice;
    return sum + s.quantity * livePrice;
  }, 0);

  const totalInvested = portfolio.reduce(
    (sum, s) => sum + s.quantity * s.boughtPrice,
    0
  );

  const totalGainLoss = totalValue - totalInvested;
  const totalGainLossPercent = ((totalGainLoss / totalInvested) * 100) || 0;

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Portfolio
      </Typography>

      {/* Add Stock */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6">Add New Stock</Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Symbol"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              type="number"
              fullWidth
              label="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              type="number"
              fullWidth
              label="Bought Price"
              value={boughtPrice}
              onChange={(e) => setBoughtPrice(Number(e.target.value))}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleAddStock}
              sx={{ height: "100%" }}
            >
              Add Stock
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Portfolio Summary */}
      <Card sx={{ mb: 3, p: 2, backgroundColor: "#f5f5f5" }}>
        <Typography variant="h6">Portfolio Summary</Typography>
        <Typography>Total Value: ${totalValue.toFixed(2)}</Typography>
        <Typography>
          Total Gain/Loss:{" "}
          <span style={{ color: totalGainLoss >= 0 ? "green" : "red" }}>
            ${totalGainLoss.toFixed(2)} ({totalGainLossPercent.toFixed(2)}%)
          </span>
        </Typography>
      </Card>

      {/* Stocks */}
      <Grid container spacing={2}>
        {portfolio.map((s) => {
          const livePrice = quotes[s.symbol]?.price || s.boughtPrice;
          const gainLoss = (livePrice - s.boughtPrice) * s.quantity;
          const gainLossPercent = ((livePrice - s.boughtPrice) / s.boughtPrice) * 100;
          return (
            <Grid item xs={12} md={6} lg={4} key={s.symbol}>
              <Card sx={{ p: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="h6">{s.symbol}</Typography>
                  <IconButton onClick={() => handleRemoveStock(s.symbol)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
                <Typography>Quantity: {s.quantity}</Typography>
                <Typography>Bought Price: ${s.boughtPrice.toFixed(2)}</Typography>
                <Typography>Current Price: ${livePrice?.toFixed(2)}</Typography>
                <Typography color={gainLoss >= 0 ? "green" : "red"}>
                  Gain/Loss: ${gainLoss.toFixed(2)} ({gainLossPercent.toFixed(2)}%)
                </Typography>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default Portfolio;
