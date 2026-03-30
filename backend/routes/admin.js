const router = require('express').Router();
const db     = require('../config/db');
const verifyToken = require('../middleware/auth');

// admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const normalizeQuestionOptions = (value) => {
  if (Array.isArray(value)) {
    return value.map((option) => String(option));
  }

  if (typeof value === 'string') {
    try {
      return normalizeQuestionOptions(JSON.parse(value));
    } catch {
      return value.trim() ? [value] : [];
    }
  }

  return [];
};

const normalizeQuestionRow = (row) => ({
  ...row,
  options: normalizeQuestionOptions(row.options),
});

// ── Questions ─────────────────────────────────────────────

// GET /api/admin/questions?module_id=1
router.get('/questions', verifyToken, adminOnly, async (req, res) => {
  try {
    const { module_id } = req.query;
    const { rows } = await db.query(`
      SELECT q.*, m.module_name, s.name as subject_name
      FROM questions q
      JOIN modules m ON m.id = q.module_id
      JOIN subjects s ON s.id = m.subject_id
      ${module_id ? 'WHERE q.module_id = $1' : ''}
      ORDER BY q.id DESC
    `, module_id ? [module_id] : []);
    res.json(rows.map(normalizeQuestionRow));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/questions
router.post('/questions', verifyToken, adminOnly, async (req, res) => {
  try {
    const { module_id, topic, difficulty, question, options, correct_answer } = req.body;
    if (!module_id || !question || !options || !correct_answer) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (options.length !== 4) {
      return res.status(400).json({ error: 'Exactly 4 options required' });
    }
    if (!options.includes(correct_answer)) {
      return res.status(400).json({ error: 'Correct answer must match one of the options' });
    }
    const { rows } = await db.query(`
      INSERT INTO questions (module_id, topic, difficulty, question, options, correct_answer)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6)
      RETURNING id
    `, [module_id, topic, difficulty, question, JSON.stringify(options), correct_answer]);

    const { rows: questionRows } = await db.query(`
      SELECT q.*, m.module_name, s.name as subject_name
      FROM questions q
      JOIN modules m ON m.id = q.module_id
      JOIN subjects s ON s.id = m.subject_id
      WHERE q.id = $1
    `, [rows[0].id]);

    res.json(normalizeQuestionRow(questionRows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/questions/:id
router.delete('/questions/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM questions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Modules ───────────────────────────────────────────────

// POST /api/admin/modules
router.post('/modules', verifyToken, adminOnly, async (req, res) => {
  try {
    const { subject_id, module_name, difficulty, estimated_hours } = req.body;
    if (!subject_id || !module_name) {
      return res.status(400).json({ error: 'Subject and module name required' });
    }
    const { rows } = await db.query(`
      INSERT INTO modules (subject_id, module_name, difficulty, estimated_hours)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [subject_id, module_name, difficulty || 'Medium', estimated_hours || 1]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Notes ─────────────────────────────────────────────────

// POST /api/admin/notes
router.post('/notes', verifyToken, adminOnly, async (req, res) => {
  try {
    const { module_id, title, content } = req.body;
    if (!module_id || !title || !content) {
      return res.status(400).json({ error: 'All fields required' });
    }
    const { rows } = await db.query(`
      INSERT INTO notes (module_id, title, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [module_id, title, content]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
