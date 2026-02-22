const express = require("express");
const cors = require("cors");

const assessmentRoutes = require("./routes/assessmentRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/assessment", assessmentRoutes);

module.exports = app;