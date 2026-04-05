const express = require("express");
const cors = require("cors");

const adminRoutes = require("../routes/admin");
const assessmentRoutes = require("./routes/assessmentRoutes");
const subjectRoutes    = require("../routes/subjects");
const testRoutes       = require("../routes/tests");
const notesRoutes = require("../routes/notes");
const plannerRoutes = require("../routes/planner");
const profileRoutes = require("../routes/profile");
const miniTestRoutes = require("../routes/minitest");
const notificationRoutes = require("../routes/notifications");
const authRoutes       = require("../routes/auth");
const analyticsRoutes = require("../routes/analytics");
const recommendationRoutes = require("../routes/recommendations");


const app = express();

const allowedOrigins = [
  "http://localhost:8080",
  "http://localhost:5173",
  "https://study-beta-henna.vercel.app",
  ...(process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((origin) => origin.trim()).filter(Boolean)
    : []),
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

app.use("/api/admin", adminRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/auth",       authRoutes);
app.use("/api/assessment", assessmentRoutes);
app.use("/api/subjects",   subjectRoutes);
app.use("/api/tests",      testRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/planner", plannerRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/minitest", miniTestRoutes);
app.use("/api/notifications", notificationRoutes);

module.exports = app;
