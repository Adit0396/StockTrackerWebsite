// src/api.js
import axios from "axios";

const BASE_URL = "http://localhost:5001/api";

export const getStockPrice = async (ticker) => {
  try {
    const res = await axios.get(`${BASE_URL}/price/${ticker}`);
    return res.data;
  } catch (err) {
    console.error("Error fetching price:", err);
    return null;
  }
};
