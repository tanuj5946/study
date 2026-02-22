const express = require("express");
const router = express.Router();
const assessmentController = require("../controllers/assessmentController");

router.post("/generate", assessmentController.generateTest);
router.post("/submit", assessmentController.submitAssessment);
module.exports = router;