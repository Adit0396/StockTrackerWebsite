import React from "react";
import { Line } from "react-chartjs-2";
import { Typography, Box } from "@mui/material";

export default function StockChart({ history, ticker }) {
  if (!history || history.length === 0) {
    return <Typography>No historical data for {ticker}</Typography>;
  }

  const safeHistory = history.map(d => ({
    ...d,
    close: Number(d.close ?? 0),
    date: d.date ?? ""
  }));
  

  const chartData = {
    labels: safeHistory.map(d => d.date),
    datasets: [
      {
        label: ticker,
        data: safeHistory.map(d => d.close),
        fill: true,
        backgroundColor: "rgba(33,150,243,0.2)",
        borderColor: "#2196f3",
        tension: 0.3
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: true },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          label: function (context) {
            return `Close: $${context.raw.toFixed(2)}`;
          }
        }
      }
    },
    interaction: { mode: "nearest", axis: "x", intersect: false },
    scales: {
      x: { display: true },
      y: { display: true }
    }
  };

  return (
    <Box sx={{ height: 300 }}>
      <Line data={chartData} options={options} />
    </Box>
  );
}
