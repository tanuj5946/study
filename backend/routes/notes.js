const router = require('express').Router();
const db = require('../config/db');
const verifyToken = require('../middleware/auth');

let initPromise;

function ensureNoteProgressTable() {
  if (!initPromise) {
    initPromise = db.query(`
      CREATE TABLE IF NOT EXISTS note_progress (
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        note_id integer NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        last_read_at timestamp without time zone NULL,
        completed boolean NOT NULL DEFAULT false,
        completed_at timestamp without time zone NULL,
        created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, note_id)
      )
    `);
  }

  return initPromise;
}

// POST /api/notes/:noteId/read
router.post('/:noteId/read', verifyToken, async (req, res) => {
  try {
    await ensureNoteProgressTable();

    const noteId = Number.parseInt(req.params.noteId, 10);
    if (Number.isNaN(noteId)) {
      return res.status(400).json({ error: 'Invalid note id' });
    }

    const { rows } = await db.query(
      `INSERT INTO note_progress (
         user_id, note_id, last_read_at, updated_at
       )
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, note_id) DO UPDATE SET
         last_read_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       RETURNING
         note_id,
         last_read_at,
         completed,
         completed_at`,
      [req.user.id, noteId]
    );

    res.json({
      success: true,
      progress: rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notes/:noteId/progress
router.patch('/:noteId/progress', verifyToken, async (req, res) => {
  try {
    await ensureNoteProgressTable();

    const noteId = Number.parseInt(req.params.noteId, 10);
    const completed = Boolean(req.body.completed);

    if (Number.isNaN(noteId)) {
      return res.status(400).json({ error: 'Invalid note id' });
    }

    const { rows } = await db.query(
      `INSERT INTO note_progress (
         user_id, note_id, last_read_at, completed, completed_at, updated_at
       )
       VALUES (
         $1,
         $2,
         CURRENT_TIMESTAMP,
         $3,
         CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE NULL END,
         CURRENT_TIMESTAMP
       )
       ON CONFLICT (user_id, note_id) DO UPDATE SET
         last_read_at = COALESCE(note_progress.last_read_at, CURRENT_TIMESTAMP),
         completed = EXCLUDED.completed,
         completed_at = CASE
           WHEN EXCLUDED.completed THEN CURRENT_TIMESTAMP
           ELSE NULL
         END,
         updated_at = CURRENT_TIMESTAMP
       RETURNING
         note_id,
         last_read_at,
         completed,
         completed_at`,
      [req.user.id, noteId, completed]
    );

    res.json({
      success: true,
      progress: rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notes/:moduleId
router.get('/:moduleId', verifyToken, async (req, res) => {
  try {
    await ensureNoteProgressTable();

    const { rows } = await db.query(`
      SELECT
        n.id,
        n.title,
        n.content,
        n.created_at,
        np.last_read_at,
        COALESCE(np.completed, false) AS completed,
        np.completed_at
      FROM notes n
      LEFT JOIN note_progress np
        ON np.note_id = n.id
       AND np.user_id = $2
      WHERE n.module_id = $1
      ORDER BY
        COALESCE(NULLIF(regexp_replace(lower(n.title), '[^0-9]', '', 'g'), ''), '0')::int,
        lower(n.title),
        n.created_at ASC
    `, [req.params.moduleId, req.user.id]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
