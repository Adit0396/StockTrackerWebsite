import React, { useEffect, useState } from "react";
import { Grid, Box, Typography, Card, CardContent } from "@mui/material";
import StockCard from "./StockCard";
import NewsSideBar from "./NewsCarousel";
import { fetchQuote } from "../api";

const Dashboard = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [insights, setInsights] = useState({ total: 0, topGainer: null, topLoser: null });

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("portfolio")) || [];
    setPortfolio(saved);

    const loadInsights = async () => {
      if (!saved.length) return;
      const quotes = await Promise.all(saved.map((s) => fetchQuote(s.symbol)));
      let total = 0;
      let topGainer = quotes[0];
      let topLoser = quotes[0];

      quotes.forEach((q) => {
        const quantity = saved.find((st) => st.symbol === q.symbol)?.quantity ?? 1;
        const value = (q.price ?? 0) * quantity;
        total += value;

        if ((q.changePercent ?? 0) > (topGainer.changePercent ?? 0)) topGainer = q;
        if ((q.changePercent ?? 0) < (topLoser.changePercent ?? 0)) topLoser = q;
      });

      setInsights({ total, topGainer, topLoser });
    };

    loadInsights();
  }, []);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Portfolio Summary */}
      <Box sx={{ mb: 2 }}>
        <Card>
          <CardContent>
            <Typography variant="h6">Portfolio Summary</Typography>
            <Typography>Total stocks: {portfolio.reduce((sum, s) => sum + s.quantity, 0)}</Typography>
            {portfolio.length > 0 && insights.total > 0 && (
              <>
                <Typography>Total Portfolio Value: ${insights.total.toFixed(2)}</Typography>
                <Typography>
                  Top Gainer: {insights.topGainer?.symbol ?? "-"} (
                  {insights.topGainer?.changePercent != null
                    ? insights.topGainer.changePercent.toFixed(2)
                    : "-"}%)
                </Typography>
                <Typography>
                  Top Loser: {insights.topLoser?.symbol ?? "-"} (
                  {insights.topLoser?.changePercent != null
                    ? insights.topLoser.changePercent.toFixed(2)
                    : "-"}%)
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          {portfolio.length === 0 ? (
            <Typography variant="body1">No stocks in your portfolio.</Typography>
          ) : (
            <Grid container spacing={2}>
              {portfolio.map((s) => (
                <Grid item xs={12} sm={6} md={4} key={s.symbol}>
                  <StockCard symbol={s.symbol} quantity={s.quantity} removeStock={() => {}} />
                </Grid>
              ))}
            </Grid>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          <NewsSideBar />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
