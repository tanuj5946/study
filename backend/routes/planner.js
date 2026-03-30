const router = require('express').Router();
const db = require('../config/db');
const verifyToken = require('../middleware/auth');

const sessionSelect = `
  SELECT
    id,
    user_id,
    module_id,
    duration_minutes,
    CASE
      WHEN session_date IS NULL THEN NULL
      ELSE to_char(session_date, 'YYYY-MM-DD"T"HH24:MI:SS')
    END AS session_date,
    title,
    description,
    CASE
      WHEN date IS NULL THEN NULL
      ELSE to_char(date, 'YYYY-MM-DD')
    END AS date,
    CASE
      WHEN start_time IS NULL THEN NULL
      ELSE to_char(start_time, 'HH24:MI:SS')
    END AS start_time,
    completed
  FROM study_sessions
`;

// GET /api/planner?from=yyyy-mm-dd&to=yyyy-mm-dd
router.get('/', verifyToken, async (req, res) => {
  try {
    const { from, to } = req.query;
    const { rows } = await db.query(`
      ${sessionSelect}
      WHERE user_id = $1
        AND date >= $2
        AND date <= $3
      ORDER BY date ASC, start_time ASC
    `, [req.user.id, from, to]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/planner — create session
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, date, start_time, duration_minutes, module_id } = req.body;
    const { rows } = await db.query(`
      WITH inserted AS (
        INSERT INTO study_sessions
          (user_id, title, description, date, start_time, duration_minutes, module_id, completed)
        VALUES ($1,$2,$3,$4,$5,$6,$7,false)
        RETURNING *
      )
      SELECT
        id,
        user_id,
        module_id,
        duration_minutes,
        CASE
          WHEN session_date IS NULL THEN NULL
          ELSE to_char(session_date, 'YYYY-MM-DD"T"HH24:MI:SS')
        END AS session_date,
        title,
        description,
        CASE
          WHEN date IS NULL THEN NULL
          ELSE to_char(date, 'YYYY-MM-DD')
        END AS date,
        CASE
          WHEN start_time IS NULL THEN NULL
          ELSE to_char(start_time, 'HH24:MI:SS')
        END AS start_time,
        completed
      FROM inserted
    `, [req.user.id, title, description, date, start_time || null, duration_minutes, module_id || null]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/planner/:id — update session
router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const { title, description, date, start_time, duration_minutes, module_id, completed } = req.body;
    const { rows } = await db.query(`
      WITH updated AS (
        UPDATE study_sessions SET
          title            = COALESCE($1, title),
          description      = COALESCE($2, description),
          date             = COALESCE($3, date),
          start_time       = $4,
          duration_minutes = COALESCE($5, duration_minutes),
          module_id        = $6,
          completed        = COALESCE($7, completed)
        WHERE id = $8 AND user_id = $9
        RETURNING *
      )
      SELECT
        id,
        user_id,
        module_id,
        duration_minutes,
        CASE
          WHEN session_date IS NULL THEN NULL
          ELSE to_char(session_date, 'YYYY-MM-DD"T"HH24:MI:SS')
        END AS session_date,
        title,
        description,
        CASE
          WHEN date IS NULL THEN NULL
          ELSE to_char(date, 'YYYY-MM-DD')
        END AS date,
        CASE
          WHEN start_time IS NULL THEN NULL
          ELSE to_char(start_time, 'HH24:MI:SS')
        END AS start_time,
        completed
      FROM updated
    `, [title, description, date, start_time || null, duration_minutes, module_id || null, completed, req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Session not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/planner/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM study_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
