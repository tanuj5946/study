const router = require('express').Router();
const db = require('../config/db');
const verifyToken = require('../middleware/auth');

// GET /api/analytics/summary — overall stats
router.get('/summary', verifyToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const { rows: summary } = await db.query(`
      SELECT
        COUNT(*)::int                                    as total_tests,
        COALESCE(AVG(percentage), 0)::numeric(5,2)      as avg_score,
        COALESCE(MAX(percentage), 0)::numeric(5,2)      as best_score,
        COUNT(CASE WHEN percentage >= 60 THEN 1 END)::int as passed,
        COUNT(CASE WHEN percentage < 60 THEN 1 END)::int  as failed
      FROM assessments
      WHERE user_id = $1
    `, [user_id]);

    const { rows: bySubject } = await db.query(`
      SELECT
        s.name                                        as subject_name,
        COUNT(*)::int                                 as total_tests,
        AVG(a.percentage)::numeric(5,2)               as avg_score
      FROM assessments a
      JOIN modules m ON m.id = a.module_id
      JOIN subjects s ON s.id = m.subject_id
      WHERE a.user_id = $1
      GROUP BY s.id, s.name
      ORDER BY avg_score DESC
    `, [user_id]);

    const { rows: topicMastery } = await db.query(`
      SELECT topic, accuracy::numeric(5,2), attempts
      FROM topic_mastery
      WHERE user_id = $1
      ORDER BY accuracy ASC
    `, [user_id]);

    const { rows: trend } = await db.query(`
      SELECT
        DATE(a.created_at)             as date,
        AVG(a.percentage)::numeric(5,2) as avg_score,
        COUNT(*)::int                   as tests_taken
      FROM assessments a
      WHERE a.user_id = $1
      GROUP BY DATE(a.created_at)
      ORDER BY date ASC
      LIMIT 30
    `, [user_id]);

    res.json({ summary: summary[0], bySubject, topicMastery, trend });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/results — full results list
router.get('/results', verifyToken, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        a.id,
        a.score,
        a.total_questions,
        a.percentage,
        a.created_at,
        m.module_name,
        s.name as subject_name,
        CASE WHEN a.percentage >= 60 THEN true ELSE false END as passed
      FROM assessments a
      JOIN modules m ON m.id = a.module_id
      JOIN subjects s ON s.id = m.subject_id
      WHERE a.user_id = $1
      ORDER BY a.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/results/:id — single result with question breakdown
router.get('/results/:id', verifyToken, async (req, res) => {
  try {
    const { rows: result } = await db.query(`
      SELECT
        a.id, a.score, a.total_questions, a.percentage, a.created_at,
        m.module_name, s.name as subject_name,
        CASE WHEN a.percentage >= 60 THEN true ELSE false END as passed
      FROM assessments a
      JOIN modules m ON m.id = a.module_id
      JOIN subjects s ON s.id = m.subject_id
      WHERE a.id = $1 AND a.user_id = $2
    `, [req.params.id, req.user.id]);

    if (!result.length) return res.status(404).json({ error: 'Result not found' });

    const { rows: answers } = await db.query(`
      SELECT
        aa.question_id,
        aa.selected_answer,
        aa.is_correct,
        q.question,
        q.options,
        q.correct_answer,
        q.topic,
        q.difficulty
      FROM assessment_answers aa
      JOIN questions q ON q.id = aa.question_id
      WHERE aa.assessment_id = $1
      ORDER BY aa.id ASC
    `, [req.params.id]);

    res.json({ ...result[0], answers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;