import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import stockRoutes from "./routes/stocks.js"; // make sure path is correct

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// 🔹 mount the router under /api
app.use("/api", stockRoutes);

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
