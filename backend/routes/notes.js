const router = require('express').Router();
const db = require('../config/db');
const verifyToken = require('../middleware/auth');
const { generateAnswer } = require('../lib/ollamaClient');

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

function extractJsonObject(text) {
  if (!text) return null;

  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function splitIntoSentences(text) {
  return text
    .replace(/\r/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function buildFallbackRevisionPack(note) {
  const cleanText = note.content
    .replace(/[#>*`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const sentences = splitIntoSentences(cleanText);
  const summary = sentences.slice(0, 3);

  const flashcards = sentences.slice(0, 5).map((sentence, index) => ({
    id: `fallback-card-${index + 1}`,
    front: index === 0
      ? `What is the main idea of "${note.title}"?`
      : `What should you remember from point ${index + 1}?`,
    back: sentence,
  }));

  const quickQuestions = sentences.slice(0, 3).map((sentence, index) => ({
    id: `fallback-quiz-${index + 1}`,
    question: `Explain this in one line: point ${index + 1} from "${note.title}".`,
    answer: sentence,
  }));

  return {
    summary,
    flashcards,
    quickQuestions,
    tutorTips: [
      `Is note ko apne words me 2-minute recap karo.`,
      `Har flashcard ko dekhne ke baad answer bolkar verify karo.`,
      `Quick questions attempt karke weak points mark karo.`,
    ],
  };
}

async function generateRevisionPack(note) {
  const prompt = `You are creating a revision pack for a student.

Return ONLY valid JSON. No markdown, no commentary.

JSON shape:
{
  "summary": ["3 to 5 concise bullets"],
  "flashcards": [
    { "front": "short prompt", "back": "short answer" }
  ],
  "quickQuestions": [
    { "question": "short revision question", "answer": "short ideal answer" }
  ],
  "tutorTips": ["3 short study tips"]
}

Rules:
- Use the note only.
- Keep flashcards and answers simple and exam-focused.
- Generate exactly 5 flashcards.
- Generate exactly 3 quickQuestions.
- Keep each item short.

Title: ${note.title}
Content:
${note.content.slice(0, 7000)}`;

  const response = await generateAnswer(
    [
      {
        role: 'system',
        content: 'You create compact, valid JSON revision packs for study notes.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    {
      ollamaOptions: {
        temperature: 0.1,
        top_p: 0.8,
        num_predict: 500,
      },
    }
  );

  const parsed = extractJsonObject(response);
  if (!parsed) {
    throw new Error('Could not parse revision pack JSON');
  }

  return {
    summary: Array.isArray(parsed.summary) ? parsed.summary.slice(0, 5) : [],
    flashcards: Array.isArray(parsed.flashcards)
      ? parsed.flashcards.slice(0, 5).map((card, index) => ({
          id: `card-${index + 1}`,
          front: String(card.front || '').trim(),
          back: String(card.back || '').trim(),
        }))
      : [],
    quickQuestions: Array.isArray(parsed.quickQuestions)
      ? parsed.quickQuestions.slice(0, 3).map((item, index) => ({
          id: `quiz-${index + 1}`,
          question: String(item.question || '').trim(),
          answer: String(item.answer || '').trim(),
        }))
      : [],
    tutorTips: Array.isArray(parsed.tutorTips)
      ? parsed.tutorTips.slice(0, 3).map((tip) => String(tip).trim()).filter(Boolean)
      : [],
  };
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

// GET /api/notes/:noteId/revision-pack
router.get('/:noteId/revision-pack', verifyToken, async (req, res) => {
  try {
    const noteId = Number.parseInt(req.params.noteId, 10);
    if (Number.isNaN(noteId)) {
      return res.status(400).json({ error: 'Invalid note id' });
    }

    const { rows } = await db.query(
      `SELECT n.id, n.title, n.content, n.module_id
       FROM notes n
       WHERE n.id = $1`,
      [noteId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Note not found' });
    }

    let pack;
    try {
      pack = await generateRevisionPack(rows[0]);
    } catch (error) {
      console.warn('Revision pack generation failed, using fallback:', error.message);
      pack = buildFallbackRevisionPack(rows[0]);
    }

    res.json(pack);
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
