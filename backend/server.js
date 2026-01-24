require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

app.get("/api/price/:ticker", async (req, res) => {
  const { ticker } = req.params;

  try {
    const response = await axios.get(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`
    );
    res.json(response.data); // returns current price info
  } catch (err) {
    console.error("Request failed with status code", err.response?.status);
    res.status(err.response?.status || 500).json({ error: "API request failed" });
  }
});

const port = process.env.PORT || 5001;
app.listen(port, () => console.log(`Server running on port ${port}`));
