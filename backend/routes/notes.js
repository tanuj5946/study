const router = require('express').Router();
const db = require('../config/db');
const verifyToken = require('../middleware/auth');

// GET /api/notes/:moduleId
router.get('/:moduleId', verifyToken, async (req, res) => {
  const { rows } = await db.query(`
    SELECT id, title, content, created_at
    FROM notes
    WHERE module_id = $1
    ORDER BY created_at ASC
  `, [req.params.moduleId]);
  res.json(rows);
});

module.exports = router;