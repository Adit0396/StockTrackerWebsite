// src/App.jsx
import React, { useState } from "react"; // ✅ Add React here
import { getStockPrice } from "./api";

function App() {
  const [ticker, setTicker] = useState("AAPL");
  const [price, setPrice] = useState(null);
  const [error, setError] = useState("");

  const handleGetPrice = async () => {
    const data = await getStockPrice(ticker.toUpperCase());
    if (data) {
      setPrice(data.c); // 'c' is current price from Finnhub
      setError("");
    } else {
      setError("Stock not found or backend error");
      setPrice(null);
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>📈 Stock Tracker</h1>
      <input
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value)}
        placeholder="Enter ticker (e.g. AAPL)"
      />
      <button onClick={handleGetPrice}>Get Price</button>
      {price !== null && <h2>Current Price: ${price}</h2>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default App;
