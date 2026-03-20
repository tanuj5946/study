const router = require('express').Router();
const db = require('../config/db');
const verifyToken = require('../middleware/auth');

const PASS_SCORE    = 3;
const TOTAL_Q       = 4;
const MAX_ATTEMPTS  = 3;

// GET /api/minitest/:moduleId/questions — 4 random questions
router.get('/:moduleId/questions', verifyToken, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, question, correct_answer,options, topic
      FROM questions
      WHERE module_id = $1
      ORDER BY RANDOM()
      LIMIT 4
    `, [req.params.moduleId]);

    if (rows.length < 4) {
      return res.status(400).json({ error: 'Not enough questions for mini test' });
    }

    // strip correct_answer before sending to frontend
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/minitest/:moduleId/status — check unlock status + attempts
router.get('/:moduleId/status', verifyToken, async (req, res) => {
  try {
    const user_id   = req.user.id;
    const module_id = parseInt(req.params.moduleId);

    // check if already unlocked
    const unlocked = await db.query(
      'SELECT id FROM module_unlocks WHERE user_id=$1 AND module_id=$2',
      [user_id, module_id]
    );

    // count attempts
    const attempts = await db.query(
      'SELECT * FROM mini_test_attempts WHERE user_id=$1 AND module_id=$2 ORDER BY attempted_at ASC',
      [user_id, module_id]
    );

    const attemptCount = attempts.rows.length;
    const passed       = attempts.rows.some(a => a.passed);
    const flagged      = attemptCount >= MAX_ATTEMPTS && !passed;

    res.json({
      unlocked:     unlocked.rows.length > 0,
      attempts:     attemptCount,
      max_attempts: MAX_ATTEMPTS,
      passed,
      flagged,
      can_attempt:  !passed && attemptCount < MAX_ATTEMPTS,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/minitest/:moduleId/submit — submit mini test
router.post('/:moduleId/submit', verifyToken, async (req, res) => {
  try {
    const user_id   = req.user.id;
    const module_id = parseInt(req.params.moduleId);
    const { answers } = req.body;
    // answers: [{ question_id, selected_answer }]

    // get correct answers from DB
    const ids = answers.map(a => a.question_id);
    const { rows: questions } = await db.query(
      `SELECT id, correct_answer FROM questions WHERE id = ANY($1)`,
      [ids]
    );

    const correctMap = Object.fromEntries(questions.map(q => [q.id, q.correct_answer]));
    const score = answers.filter(a => correctMap[a.question_id] === a.selected_answer).length;
    const passed = score >= PASS_SCORE;

    // check attempt count
    const { rows: prevAttempts } = await db.query(
      'SELECT id FROM mini_test_attempts WHERE user_id=$1 AND module_id=$2',
      [user_id, module_id]
    );

    if (prevAttempts.length >= MAX_ATTEMPTS) {
      return res.status(400).json({ error: 'Max attempts reached' });
    }

    const attemptNumber = prevAttempts.length + 1;
    const flagged       = !passed && attemptNumber >= MAX_ATTEMPTS;

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // save attempt
      await client.query(`
        INSERT INTO mini_test_attempts (user_id, module_id, score, total, passed, flagged)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [user_id, module_id, score, TOTAL_Q, passed, flagged]);

      if (passed) {
        // find the next module in same subject and unlock it
        const { rows: nextModule } = await client.query(`
          SELECT m2.id FROM modules m1
          JOIN modules m2 ON m2.subject_id = m1.subject_id AND m2.id > m1.id
          WHERE m1.id = $1
          ORDER BY m2.id ASC
          LIMIT 1
        `, [module_id]);

        if (nextModule.length) {
          await client.query(`
            INSERT INTO module_unlocks (user_id, module_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
          `, [user_id, nextModule[0].id]);
        }
      }

      // if flagged — still unlock but mark as flagged
      if (flagged) {
        const { rows: nextModule } = await client.query(`
          SELECT m2.id FROM modules m1
          JOIN modules m2 ON m2.subject_id = m1.subject_id AND m2.id > m1.id
          WHERE m1.id = $1
          ORDER BY m2.id ASC
          LIMIT 1
        `, [module_id]);

        if (nextModule.length) {
          await client.query(`
            INSERT INTO module_unlocks (user_id, module_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
          `, [user_id, nextModule[0].id]);
        }
      }

      await client.query('COMMIT');

      res.json({
        score,
        total:          TOTAL_Q,
        passed,
        flagged,
        attempts_used:  attemptNumber,
        attempts_left:  Math.max(0, MAX_ATTEMPTS - attemptNumber),
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/minitest/unlocks — get all unlocked module ids for current user
router.get('/unlocks', verifyToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT module_id FROM module_unlocks WHERE user_id = $1',
      [req.user.id]
    );

    // also get flagged modules
    const { rows: flagged } = await db.query(`
      SELECT DISTINCT module_id FROM mini_test_attempts
      WHERE user_id = $1 AND flagged = true
    `, [req.user.id]);

    res.json({
      unlocked_ids: rows.map(r => r.module_id),
      flagged_ids:  flagged.map(r => r.module_id),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;