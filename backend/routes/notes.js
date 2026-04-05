const router = require('express').Router();
const db = require('../config/db');
const verifyToken = require('../middleware/auth');
const { generateAnswer } = require('../lib/aiClient');

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

function extractJsonValue(text) {
  if (!text) return null;

  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1] : text;
  const objectStart = candidate.indexOf('{');
  const objectEnd = candidate.lastIndexOf('}');
  const arrayStart = candidate.indexOf('[');
  const arrayEnd = candidate.lastIndexOf(']');

  let start = -1;
  let end = -1;

  if (arrayStart !== -1 && arrayEnd > arrayStart && (objectStart === -1 || arrayStart < objectStart)) {
    start = arrayStart;
    end = arrayEnd;
  } else if (objectStart !== -1 && objectEnd > objectStart) {
    start = objectStart;
    end = objectEnd;
  }

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function splitNoteIntoSections(content) {
  const source = String(content || '').replace(/\r\n/g, '\n').trim();
  if (!source) {
    return [];
  }

  const headingRegex = /(^|\n)(#{1,6}\s+.+)(?:\n|$)/g;
  const headingMatches = Array.from(source.matchAll(headingRegex));

  if (headingMatches.length === 0) {
    return source
      .split(/\n{2,}/)
      .map((section) => section.trim())
      .filter((section) => section.length > 60)
      .slice(0, 5)
      .map((section, index) => ({
        section_index: index,
        heading: `Section ${index + 1}`,
        content: section,
      }));
  }

  const sections = headingMatches.map((match, index) => {
    const headingLine = match[2].trim();
    const start = match.index + match[0].length;
    const end = index + 1 < headingMatches.length
      ? headingMatches[index + 1].index
      : source.length;
    const chunk = source.slice(start, end).trim();

    return {
      section_index: index,
      heading: headingLine.replace(/^#{1,6}\s*/, '').trim(),
      content: chunk,
    };
  });

  return sections
    .filter((section) => section.content.replace(/^#{1,6}\s+/gm, '').trim().length > 60)
    .slice(0, 5);
}

function stripMarkdown(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_>~-]/g, ' ')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildFallbackInlineChecks(note) {
  const sections = splitNoteIntoSections(note.content);

  return sections.map((section, index) => {
    const clean = stripMarkdown(section.content);
    const sentences = splitIntoSentences(clean);
    const mainIdea = sentences[0] || clean.slice(0, 140);
    const secondary = sentences[1] || `A supporting point from ${section.heading}`;

    return {
      section_index: index,
      heading: section.heading,
      question: `Which option best captures the main idea of "${section.heading}"?`,
      options: [
        mainIdea,
        secondary,
        `An unrelated point from another topic`,
        `A practical task not discussed in this section`,
      ].map((option) => option.slice(0, 140)),
      correct_answer: mainIdea.slice(0, 140),
      explanation: `This section mainly focuses on: ${mainIdea.slice(0, 180)}.`,
    };
  });
}

function splitIntoSentences(text) {
  return text
    .replace(/\r/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function sanitizeChatHistory(history = []) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((item) => item && typeof item.text === 'string')
    .map((item) => ({
      role: item.role === 'bot' ? 'assistant' : 'user',
      content: item.text.trim().slice(0, 2500),
    }))
    .filter((item) => item.content.length > 0)
    .slice(-8);
}

async function generateNoteChatReply(note, message, history = [], extraContext = '') {
  const trimmedExtraContext = String(extraContext || '').trim();
  const userPrompt = trimmedExtraContext
    ? `Extra note context:
${trimmedExtraContext}

Student question:
${message}`
    : message;

  return generateAnswer(
    [
      {
        role: 'system',
        content: `You are StudySync Note Tutor.

You are helping a student inside a single note session.

Rules:
1. Reply in Hinglish.
2. Use the note content as the primary source of truth.
3. Use recent chat history to understand follow-up references like "this", "that point", "same topic", or "compare it".
4. Stay focused on the current note unless extra context is explicitly provided.
5. If the answer is not supported by the current note or extra context, clearly say that and guide the student back to the note.
6. Keep replies concise, student-friendly, and use valid markdown when helpful.
7. For concept explanations, prefer: short heading, short explanation, 3-5 bullets, and one example if useful.

Current note title: ${note.title}

Current note content:
${String(note.content || '').slice(0, 7000)}`,
      },
      ...history,
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    {
      modelOptions: {
        temperature: 0.15,
        top_p: 0.85,
        max_tokens: 420,
      },
    }
  );
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
      modelOptions: {
        temperature: 0.1,
        top_p: 0.8,
        max_tokens: 500,
      },
    }
  );

  const parsed = extractJsonValue(response);
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

async function generateInlineChecks(note) {
  const sections = splitNoteIntoSections(note.content);
  if (sections.length === 0) {
    return [];
  }

  const fallbackChecks = buildFallbackInlineChecks(note);

  const sectionPayload = sections.map((section) => ({
    section_index: section.section_index,
    heading: section.heading,
    content: stripMarkdown(section.content).slice(0, 700),
  }));

  const response = await generateAnswer(
    [
      {
        role: 'system',
        content: `You create one tiny multiple-choice knowledge check per note section.
Return ONLY valid JSON array.
Each item must be:
{
  "section_index": number,
  "heading": "section heading",
  "question": "one short MCQ question",
  "options": ["A", "B", "C", "D"],
  "correct_answer": "exactly one of the options",
  "explanation": "one short explanation"
}
Rules:
- 4 options exactly.
- Keep wording simple.
- Correct answer must match one option exactly.
- Questions should check understanding, not trivia.
- Use only the provided section content.`,
      },
      {
        role: 'user',
        content: `Note title: ${note.title}
Sections:
${JSON.stringify(sectionPayload)}`,
      },
    ],
    {
      modelOptions: {
        temperature: 0.1,
        top_p: 0.8,
        max_tokens: 800,
      },
    }
  );

  const parsed = extractJsonValue(response);
  if (!Array.isArray(parsed)) {
    throw new Error('Could not parse inline checks JSON');
  }

  return sections.map((section, index) => {
    const item = parsed.find((entry) => Number(entry.section_index) === section.section_index) || {};
    const options = Array.isArray(item.options)
      ? item.options.map((option) => String(option).trim()).filter(Boolean).slice(0, 4)
      : [];

    const fallback = fallbackChecks[index];

    return {
      section_index: section.section_index,
      heading: String(item.heading || fallback?.heading || section.heading).trim(),
      question: String(item.question || fallback?.question || '').trim(),
      options: options.length === 4 ? options : fallback?.options || [],
      correct_answer: String(item.correct_answer || fallback?.correct_answer || '').trim(),
      explanation: String(item.explanation || fallback?.explanation || '').trim(),
    };
  });
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

// GET /api/notes/:noteId/inline-checks
router.get('/:noteId/inline-checks', verifyToken, async (req, res) => {
  try {
    const noteId = Number.parseInt(req.params.noteId, 10);
    if (Number.isNaN(noteId)) {
      return res.status(400).json({ error: 'Invalid note id' });
    }

    const { rows } = await db.query(
      `SELECT n.id, n.title, n.content
       FROM notes n
       WHERE n.id = $1`,
      [noteId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Note not found' });
    }

    let checks;
    try {
      checks = await generateInlineChecks(rows[0]);
    } catch (error) {
      console.warn('Inline checks generation failed, using fallback:', error.message);
      checks = buildFallbackInlineChecks(rows[0]);
    }

    res.json({ checks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notes/:noteId/chat
router.post('/:noteId/chat', verifyToken, async (req, res) => {
  try {
    const noteId = Number.parseInt(req.params.noteId, 10);
    const message = String(req.body.message || '').trim();
    const extraContext = String(req.body.extra_context || '').trim();
    const history = sanitizeChatHistory(req.body.history);

    if (Number.isNaN(noteId)) {
      return res.status(400).json({ error: 'Invalid note id' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
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

    let response;
    try {
      response = await generateNoteChatReply(rows[0], message, history, extraContext);
    } catch (error) {
      console.error('Note chat generation failed:', error.message);
      response = 'Is note ke context me answer abhi generate nahi ho paya. Thodi der baad same question phir try karo.';
    }

    res.json({ response });
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
