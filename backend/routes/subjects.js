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

// GET /api/subjects — all subjects with their modules
router.get('/', verifyToken, async (req, res) => {
  await ensureNoteProgressTable();

  const { rows } = await db.query(`
    SELECT s.id, s.name, s.description,
      json_agg(
        json_build_object(
          'id', m.id,
          'module_name', m.module_name,
          'difficulty', m.difficulty,
          'estimated_hours', m.estimated_hours,
          'notes_total', COALESCE((
            SELECT COUNT(*)::int
            FROM notes n
            WHERE n.module_id = m.id
          ), 0),
          'notes_completed', COALESCE((
            SELECT COUNT(*)::int
            FROM notes n
            JOIN note_progress np
              ON np.note_id = n.id
             AND np.user_id = $1
            WHERE n.module_id = m.id
              AND np.completed = true
          ), 0),
          'notes_done', CASE
            WHEN EXISTS (
              SELECT 1
              FROM notes n
              WHERE n.module_id = m.id
            ) AND (
              SELECT COUNT(*)::int
              FROM notes n
              JOIN note_progress np
                ON np.note_id = n.id
               AND np.user_id = $1
              WHERE n.module_id = m.id
                AND np.completed = true
            ) = (
              SELECT COUNT(*)::int
              FROM notes n
              WHERE n.module_id = m.id
            )
            THEN true
            ELSE false
          END
        ) ORDER BY m.id
      ) FILTER (WHERE m.id IS NOT NULL) as modules
    FROM subjects s
    LEFT JOIN modules m ON m.subject_id = s.id
    GROUP BY s.id
    ORDER BY s.id
  `, [req.user.id]);
  res.json(rows);
});

// GET /api/subjects/:id/modules — modules for one subject
router.get('/:id/modules', verifyToken, async (req, res) => {
  await ensureNoteProgressTable();

  const { rows } = await db.query(`
    SELECT m.*,
      COALESCE((
        SELECT COUNT(*)::int
        FROM notes n
        WHERE n.module_id = m.id
      ), 0) AS notes_total,
      COALESCE((
        SELECT COUNT(*)::int
        FROM notes n
        JOIN note_progress np
          ON np.note_id = n.id
         AND np.user_id = $2
        WHERE n.module_id = m.id
          AND np.completed = true
      ), 0) AS notes_completed,
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM notes n
          WHERE n.module_id = m.id
        ) AND (
          SELECT COUNT(*)::int
          FROM notes n
          JOIN note_progress np
            ON np.note_id = n.id
           AND np.user_id = $2
          WHERE n.module_id = m.id
            AND np.completed = true
        ) = (
          SELECT COUNT(*)::int
          FROM notes n
          WHERE n.module_id = m.id
        )
        THEN true
        ELSE false
      END AS notes_done,
      (
        SELECT json_agg(
          json_build_object(
            'id', n.id,
            'title', n.title,
            'content', n.content,
            'last_read_at', np.last_read_at,
            'completed', COALESCE(np.completed, false),
            'completed_at', np.completed_at
          )
          ORDER BY
            COALESCE(NULLIF(regexp_replace(lower(n.title), '[^0-9]', '', 'g'), ''), '0')::int,
            lower(n.title),
            n.created_at
        )
        FROM notes n
        LEFT JOIN note_progress np
          ON np.note_id = n.id
         AND np.user_id = $2
        WHERE n.module_id = m.id
      ) as notes
    FROM modules m
    WHERE m.subject_id = $1
    ORDER BY m.id
  `, [req.params.id, req.user.id]);
  res.json(rows);
});

module.exports = router;
