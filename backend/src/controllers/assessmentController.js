const pool = require("../../config/db");

/* ===============================
   1️⃣ GENERATE TEST API
================================ */

exports.generateTest = async (req, res) => {
  try {
    const { module_id, difficulty, num_questions } = req.body;

    if (!module_id || !difficulty || !num_questions) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const query = `
      SELECT id, topic, question, options
      FROM questions
      WHERE module_id = $1
        AND difficulty = $2
      ORDER BY RANDOM()
      LIMIT $3
    `;

    const result = await pool.query(query, [
      module_id,
      difficulty,
      num_questions
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No questions found" });
    }

    res.json({
      module_id,
      total_questions: result.rows.length,
      questions: result.rows
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error while generating test" });
  }
};



/* ===============================
   2️⃣ SUBMIT ASSESSMENT API
================================ */

exports.submitAssessment = async (req, res) => {
  const client = await pool.connect();

  try {
    const { user_id, module_id, answers } = req.body;

    if (!user_id || !module_id || !answers || answers.length === 0) {
      return res.status(400).json({ error: "Invalid submission data" });
    }

    await client.query("BEGIN");

    // Get correct answers from DB
    const questionIds = answers.map(a => a.question_id);

    const correctQuery = `
      SELECT id, topic, correct_answer
      FROM questions
      WHERE id = ANY($1)
    `;

    const { rows: correctRows } =
      await client.query(correctQuery, [questionIds]);

    let score = 0;
    const detailedAnswers = [];

    for (const userAnswer of answers) {
      const correctData = correctRows.find(
        q => q.id === userAnswer.question_id
      );

      if (!correctData) continue;

      const isCorrect =
        correctData.correct_answer === userAnswer.selected_answer;

      if (isCorrect) score++;

      detailedAnswers.push({
        question_id: userAnswer.question_id,
        topic: correctData.topic,
        selected_answer: userAnswer.selected_answer,
        is_correct: isCorrect
      });
    }

    const totalQuestions = answers.length;
    const percentage = (score / totalQuestions) * 100;

    // Insert into assessments table
    const insertAssessment = `
      INSERT INTO assessments
      (user_id, module_id, total_questions, score, percentage)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

    const { rows: assessmentRows } =
      await client.query(insertAssessment, [
        user_id,
        module_id,
        totalQuestions,
        score,
        percentage
      ]);

    const assessmentId = assessmentRows[0].id;

    // Insert answers
    for (const answer of detailedAnswers) {
      await client.query(
        `
        INSERT INTO assessment_answers
        (assessment_id, question_id, selected_answer, is_correct)
        VALUES ($1, $2, $3, $4)
        `,
        [
          assessmentId,
          answer.question_id,
          answer.selected_answer,
          answer.is_correct
        ]
      );
    }

    // Calculate topic accuracy
    const topicMap = {};

    for (const ans of detailedAnswers) {
      if (!topicMap[ans.topic]) {
        topicMap[ans.topic] = { correct: 0, total: 0 };
      }

      topicMap[ans.topic].total++;

      if (ans.is_correct) {
        topicMap[ans.topic].correct++;
      }
    }

    const topicAccuracy = Object.keys(topicMap).map(topic => ({
      topic,
      accuracy:
        (topicMap[topic].correct / topicMap[topic].total) * 100
    }));

    const weakTopics = topicAccuracy
      .filter(t => t.accuracy < 50)
      .map(t => t.topic);

    await client.query("COMMIT");

    res.json({
      assessment_id: assessmentId,
      score,
      total_questions: totalQuestions,
      percentage,
      topic_accuracy: topicAccuracy,
      weak_topics: weakTopics
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Submission failed" });
  } finally {
    client.release();
  }
};