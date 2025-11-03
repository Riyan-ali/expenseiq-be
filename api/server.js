const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const { RateLimiterMemory } = require("rate-limiter-flexible");

const authRoutes = require("../src/routes/auth");
const categoryRoutes = require("../src/routes/categories");
const transactionRoutes = require("../src/routes/transactions");
const reportRoutes = require("../src/routes/reports");

require("dotenv").config();

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || "*" }));
app.use(compression());
app.use(express.json());

const rateLimiter = new RateLimiterMemory({
  points: parseInt(process.env.RATE_LIMIT_MAX) || 10,
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 60000) / 1000,
});

app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch(() =>
      res.status(429).json({ success: false, message: "Too many requests" })
    );
});

let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
  console.log("MongoDB connected");
}
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/reports", reportRoutes);

module.exports = app;
