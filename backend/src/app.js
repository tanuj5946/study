const express = require("express");
const cors = require("cors");

const assessmentRoutes = require("./routes/assessmentRoutes");
const subjectRoutes    = require("../routes/subjects");
const testRoutes       = require("../routes/tests");
const notesRoutes = require("../routes/notes");
const plannerRoutes = require("../routes/planner");
const profileRoutes = require("../routes/profile");
const miniTestRoutes = require("../routes/minitest");
const authRoutes       = require("../routes/auth");

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:8080",
  credentials: true,
}));
app.use(express.json());

app.use("/api/auth",       authRoutes);
app.use("/api/assessment", assessmentRoutes);
app.use("/api/subjects",   subjectRoutes);
app.use("/api/tests",      testRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/planner", plannerRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/minitest", miniTestRoutes);

module.exports = app;