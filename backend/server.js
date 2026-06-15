const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const cron = require("node-cron");
require("dotenv").config();

console.log("Mongo URI loaded:", !!process.env.MONGODB_URI);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database
const db = require("./db/db");

// Routes
const userRouter = require("./router/user");
const documentRouter = require("./router/documents");

// Services
const { checkAndSendReminders } = require("./services/reminderChecker");

// API Routes
app.use("/api/user", userRouter);
app.use("/api/documents", documentRouter);

// Schedule reminder checks - runs every day at 8 AM
cron.schedule("0 8 * * *", () => {
    console.log("⏰ Running scheduled reminder check...");
    checkAndSendReminders();
});

// Also run every 12 hours as a backup
cron.schedule("0 */12 * * *", () => {
    console.log("⏰ Running backup reminder check...");
    checkAndSendReminders();
});

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.status(200).json({ message: "Server is running" });
});

// Start Server
app.listen(5000, () => {
    console.log(" Server is running on port 5000");
    console.log(" Scheduled reminder checker is active");
});

