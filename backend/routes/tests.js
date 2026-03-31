const router = require('express').Router();
const db     = require('../config/db');
const verifyToken = require('../middleware/auth');

// GET /api/tests/:moduleId — fetch questions for a module
router.get('/:moduleId', verifyToken, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, topic, difficulty, question, options, correct_answer
      FROM questions
      WHERE module_id = $1
      ORDER BY RANDOM()
    `, [req.params.moduleId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tests/submit — save assessment result
router.post('/submit', verifyToken, async (req, res) => {
  const { module_id, answers } = req.body;
  const user_id = req.user.id; // directly the PostgreSQL integer ID now

  const score          = answers.filter(a => a.is_correct).length;
  const total_questions = answers.length;
  const percentage     = ((score / total_questions) * 100).toFixed(2);

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // save assessment
    const { rows } = await client.query(`
      INSERT INTO assessments (user_id, module_id, total_questions, score, percentage)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [user_id, module_id, total_questions, score, percentage]);

    const assessment_id = rows[0].id;

    // save each answer
    for (const ans of answers) {
      await client.query(`
        INSERT INTO assessment_answers (assessment_id, question_id, selected_answer, is_correct)
        VALUES ($1, $2, $3, $4)
      `, [assessment_id, ans.question_id, ans.selected_answer, ans.is_correct]);
    }

    // update topic_mastery
    for (const ans of answers) {
      await client.query(`
        INSERT INTO topic_mastery (user_id, topic, accuracy, attempts)
        VALUES ($1, (SELECT topic FROM questions WHERE id = $2), $3, 1)
        ON CONFLICT (user_id, topic) DO UPDATE SET
          attempts = topic_mastery.attempts + 1,
          accuracy = ((topic_mastery.accuracy * topic_mastery.attempts) + $3)
                     / (topic_mastery.attempts + 1)
      `, [user_id, ans.question_id, ans.is_correct ? 100 : 0]);
    }

    await client.query('COMMIT');
    res.json({ assessment_id, score, total_questions, percentage });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/tests/results/me — student's history
router.get('/results/me', verifyToken, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT a.id, a.score, a.total_questions, a.percentage, a.created_at,
             m.module_name, s.name as subject_name
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

// GET /api/tests/recommendations — weak topics to study
router.get('/recommendations', verifyToken, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT topic, accuracy, attempts
      FROM topic_mastery
      WHERE user_id = $1
      ORDER BY accuracy ASC
      LIMIT 5
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tests/subject/:subjectId?difficulty=easy|medium|hard|mixed&limit=10
router.get('/subject/:subjectId', verifyToken, async (req, res) => {
  try {
    const subjectId  = parseInt(req.params.subjectId);
    const difficulty = (req.query.difficulty || 'mixed').toLowerCase();
    const limit      = parseInt(req.query.limit) || 10;

    // first verify subject exists
    const { rows: subjectCheck } = await db.query(
      'SELECT id FROM subjects WHERE id = $1', [subjectId]
    );
    if (!subjectCheck.length) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // get all module ids for this subject first
    const { rows: modules } = await db.query(
      'SELECT id FROM modules WHERE subject_id = $1', [subjectId]
    );

    if (!modules.length) {
      return res.status(404).json({ error: 'No modules found for this subject' });
    }

    const moduleIds = modules.map(m => m.id);

    let rows;

    if (difficulty === 'mixed') {
      const { rows: result } = await db.query(`
        SELECT id, module_id, topic, difficulty, question, options, correct_answer
        FROM questions
        WHERE module_id = ANY($1)
        ORDER BY RANDOM()
        LIMIT $2
      `, [moduleIds, limit]);
      rows = result;
    } else {
      const { rows: result } = await db.query(`
        SELECT id, module_id, topic, difficulty, question, options, correct_answer
        FROM questions
        WHERE module_id = ANY($1)
          AND LOWER(difficulty) = $2
        ORDER BY RANDOM()
        LIMIT $3
      `, [moduleIds, difficulty, limit]);
      rows = result;
    }

    if (!rows.length) {
      return res.status(404).json({ 
        error: `No ${difficulty === 'mixed' ? '' : difficulty + ' '}questions found for this subject` 
      });
    }

    res.json(rows);
  } catch (err) {
    console.error('Subject test error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
