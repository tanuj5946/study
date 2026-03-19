const router = require('express').Router();
const db = require('../config/db');

// GET /api/subjects — all subjects with their modules
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT s.id, s.name, s.description,
      json_agg(
        json_build_object(
          'id', m.id,
          'module_name', m.module_name,
          'difficulty', m.difficulty,
          'estimated_hours', m.estimated_hours
        ) ORDER BY m.id
      ) FILTER (WHERE m.id IS NOT NULL) as modules
    FROM subjects s
    LEFT JOIN modules m ON m.subject_id = s.id
    GROUP BY s.id
    ORDER BY s.id
  `);
  res.json(rows);
});

// GET /api/subjects/:id/modules — modules for one subject
router.get('/:id/modules', async (req, res) => {
  const { rows } = await db.query(`
    SELECT m.*, 
      (SELECT json_agg(json_build_object('id', n.id, 'title', n.title, 'content', n.content))
       FROM notes n WHERE n.module_id = m.id) as notes
    FROM modules m
    WHERE m.subject_id = $1
    ORDER BY m.id
  `, [req.params.id]);
  res.json(rows);
});

module.exports = router;