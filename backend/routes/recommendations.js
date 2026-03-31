const router = require('express').Router();
const db = require('../config/db');
const verifyToken = require('../middleware/auth');
const { ollama } = require('../lib/ollamaClient');
const { searchChunks } = require('../services/ragSearch');
const { ensureNotesSyncedForUser } = require('../services/ragNotes');

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

async function getStudentData(user_id) {
  await ensureNoteProgressTable();

  const { rows: assessments } = await db.query(`
    SELECT a.*, m.module_name, s.name AS subject_name, m.subject_id
    FROM assessments a
    JOIN modules m ON m.id = a.module_id
    JOIN subjects s ON s.id = m.subject_id
    WHERE a.user_id = $1
    ORDER BY a.created_at DESC
  `, [user_id]);

  const { rows: topicMastery } = await db.query(`
    SELECT *
    FROM topic_mastery
    WHERE user_id = $1
    ORDER BY accuracy ASC
  `, [user_id]);

  const { rows: studySessions } = await db.query(`
    SELECT ss.*, m.module_name, s.name AS subject_name
    FROM study_sessions ss
    LEFT JOIN modules m ON m.id = ss.module_id
    LEFT JOIN subjects s ON s.id = m.subject_id
    WHERE ss.user_id = $1
    ORDER BY ss.date DESC
    LIMIT 30
  `, [user_id]);

  const { rows: allModules } = await db.query(`
    SELECT
      m.*,
      s.name AS subject_name,
      COUNT(n.id)::int AS notes_total,
      COUNT(np.last_read_at)::int AS notes_read,
      COUNT(*) FILTER (WHERE np.completed = true)::int AS notes_completed,
      CASE
        WHEN COUNT(n.id) > 0 AND COUNT(*) FILTER (WHERE np.completed = true) = COUNT(n.id)
        THEN true
        ELSE false
      END AS notes_done
    FROM modules m
    JOIN subjects s ON s.id = m.subject_id
    LEFT JOIN notes n ON n.module_id = m.id
    LEFT JOIN note_progress np
      ON np.note_id = n.id
     AND np.user_id = $1
    GROUP BY m.id, s.name
    ORDER BY m.subject_id, m.id
  `, [user_id]);

  const { rows: unlocks } = await db.query(`
    SELECT module_id
    FROM module_unlocks
    WHERE user_id = $1
  `, [user_id]);

  const { rows: flagged } = await db.query(`
    SELECT DISTINCT module_id
    FROM mini_test_attempts
    WHERE user_id = $1 AND flagged = true
  `, [user_id]);

  return { assessments, topicMastery, studySessions, allModules, unlocks, flagged };
}

function generateRecommendations(data) {
  const { assessments, topicMastery, studySessions, allModules, unlocks, flagged } = data;

  const weakTopics = topicMastery
    .filter((topic) => parseFloat(topic.accuracy) < 60)
    .map((topic) => ({
      topic: topic.topic,
      accuracy: parseFloat(topic.accuracy),
      attempts: topic.attempts,
      priority: parseFloat(topic.accuracy) < 40 ? 'high' : 'medium',
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  const subjectMap = {};
  assessments.forEach((assessment) => {
    if (!subjectMap[assessment.subject_name]) {
      subjectMap[assessment.subject_name] = { scores: [], subject_id: assessment.subject_id };
    }
    subjectMap[assessment.subject_name].scores.push(parseFloat(assessment.percentage));
  });

  const subjectPerformance = Object.entries(subjectMap)
    .map(([name, subjectData]) => {
      const avg = subjectData.scores.reduce((sum, value) => sum + value, 0) / subjectData.scores.length;
      return {
        subject: name,
        avg_score: Math.round(avg),
        tests: subjectData.scores.length,
        trend: subjectData.scores.length >= 2
          ? subjectData.scores[0] > subjectData.scores[1] ? 'improving' : 'declining'
          : 'stable',
      };
    })
    .sort((a, b) => a.avg_score - b.avg_score);

  const unlockedIds = new Set(unlocks.map((unlock) => unlock.module_id));
  const flaggedIds = new Set(flagged.map((entry) => entry.module_id));
  const firstModuleBySubject = new Map();

  allModules.forEach((module) => {
    if (!firstModuleBySubject.has(module.subject_id)) {
      firstModuleBySubject.set(module.subject_id, module.id);
    }
  });

  const nextModules = allModules
    .map((module) => {
      const notesTotal = Number(module.notes_total || 0);
      const notesRead = Number(module.notes_read || 0);
      const notesCompleted = Number(module.notes_completed || 0);
      const notesDone = Boolean(module.notes_done);
      const isFlagged = flaggedIds.has(module.id);
      const isInitiallyOpen = firstModuleBySubject.get(module.subject_id) === module.id;
      const accessible = isFlagged || unlockedIds.has(module.id) || isInitiallyOpen;

      if (!accessible) {
        return null;
      }

      if (isFlagged) {
        return {
          id: module.id,
          module_name: module.module_name,
          subject_name: module.subject_name,
          difficulty: module.difficulty,
          flagged: true,
          action: 'Review',
          reason: 'Flagged after mini test - revise this module',
          notes_total: notesTotal,
          notes_completed: notesCompleted,
          sort_order: 0,
        };
      }

      if (notesDone) {
        return null;
      }

      if (notesTotal > 0 && (notesCompleted > 0 || notesRead > 0)) {
        return {
          id: module.id,
          module_name: module.module_name,
          subject_name: module.subject_name,
          difficulty: module.difficulty,
          flagged: false,
          action: 'Continue',
          reason: `${notesCompleted}/${notesTotal} notes completed`,
          notes_total: notesTotal,
          notes_completed: notesCompleted,
          sort_order: 1,
        };
      }

      return {
        id: module.id,
        module_name: module.module_name,
        subject_name: module.subject_name,
        difficulty: module.difficulty,
        flagged: false,
        action: 'Start',
        reason: notesTotal > 0 ? `Ready to read - ${notesTotal} notes pending` : 'Ready to start',
        notes_total: notesTotal,
        notes_completed: notesCompleted,
        sort_order: 2,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (
      a.sort_order - b.sort_order ||
      a.subject_name.localeCompare(b.subject_name) ||
      a.id - b.id
    ))
    .slice(0, 4)
    .map(({ sort_order, ...module }) => module);

  const recentSessions = studySessions.filter((session) => {
    const sessionDate = new Date(session.date || session.session_date);
    return (Date.now() - sessionDate.getTime()) < 7 * 24 * 60 * 60 * 1000;
  });

  const avgMinutesPerDay =
    recentSessions.reduce((sum, session) => sum + (session.duration_minutes || 0), 0) / 7;

  const predictions = weakTopics.slice(0, 3).map((topic) => {
    const improvement = topic.accuracy < 40 ? 20 : topic.accuracy < 60 ? 12 : 6;
    return {
      topic: topic.topic,
      current_accuracy: topic.accuracy,
      predicted_gain: improvement,
      predicted_score: Math.min(100, Math.round(topic.accuracy + improvement)),
    };
  });

  const studyPlan = [];
  if (weakTopics.length > 0) {
    studyPlan.push({
      day: 'Day 1-2',
      focus: weakTopics[0].topic,
      activity: 'Revise notes and re-attempt questions',
      duration: '45-60 min',
      priority: 'high',
    });
  }
  if (weakTopics.length > 1) {
    studyPlan.push({
      day: 'Day 3-4',
      focus: weakTopics[1].topic,
      activity: 'Practice questions and mini test',
      duration: '45 min',
      priority: 'medium',
    });
  }
  if (nextModules.length > 0) {
    studyPlan.push({
      day: 'Day 5',
      focus: nextModules[0].module_name,
      activity: nextModules[0].flagged
        ? 'Review flagged module and revisit the tricky concepts'
        : nextModules[0].action === 'Continue'
        ? 'Continue the remaining notes for this module'
        : 'Start this module and read the notes',
      duration: '60 min',
      priority: 'medium',
    });
  }
  studyPlan.push({
    day: 'Day 6-7',
    focus: subjectPerformance[0]?.subject || 'All subjects',
    activity: 'Full subject test - track improvement',
    duration: '30-45 min',
    priority: 'low',
  });

  return {
    weakTopics,
    subjectPerformance,
    nextModules,
    predictions,
    studyPlan,
    studyStats: {
      avg_minutes_per_day: Math.round(avgMinutesPerDay),
      sessions_this_week: recentSessions.length,
      total_tests: assessments.length,
    },
  };
}

router.get('/', verifyToken, async (req, res) => {
  try {
    const data = await getStudentData(req.user.id);
    const recommendations = generateRecommendations(data);
    res.json(recommendations);
  } catch (err) {
    console.error('Recommendations error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

function buildContext(data, recommendations) {
  const { assessments, topicMastery } = data;
  const { weakTopics, subjectPerformance, studyPlan, studyStats, nextModules, predictions } = recommendations;

  return {
    total_tests: assessments.length,
    avg_score: assessments.length
      ? Math.round(assessments.reduce((sum, assessment) => sum + parseFloat(assessment.percentage), 0) / assessments.length)
      : 0,
    weak_topics: weakTopics.map((topic) => ({
      topic: topic.topic,
      accuracy: topic.accuracy,
      priority: topic.priority,
    })),
    strong_topics: topicMastery
      .filter((topic) => parseFloat(topic.accuracy) >= 75)
      .map((topic) => topic.topic),
    subjects: subjectPerformance,
    study_plan: studyPlan,
    next_modules: nextModules,
    predictions,
    sessions_week: studyStats.sessions_this_week,
    avg_daily_mins: studyStats.avg_minutes_per_day,
    last_test: assessments[0] || null,
  };
}

function createSystemPrompt(ctx, ragChunks = []) {
  const hasData = (ctx.total_tests || 0) > 0;
  const ragSection = ragChunks.length > 0
    ? `\nRELEVANT STUDY MATERIAL (from student's notes/modules - use this to answer topic questions):\n${ragChunks.map((chunk, index) => `[${index + 1}] ${chunk.title}:\n${chunk.chunk_text}`).join('\n\n')}`
    : '';

  return `You are StudySync AI, an academic assistant embedded inside a student dashboard.

YOUR ONLY JOB:
- Help the student understand their OWN academic performance using the data below.
- If study material is provided below, use it to answer topic/concept questions.
- Give study advice, topic recommendations, and progress insights.

STRICT RULES:
1. Reply in Hinglish (Hindi + English mix).
2. If study material is available, use it to answer concept questions directly.
3. If no study material matches the question, say: "Is topic ka material abhi available nahi hai."
4. NEVER make up data. Only use the JSON context and study material provided.
5. Keep replies under 250 words. Use bullet points.
6. Do NOT act as a general chatbot - you are a dashboard assistant only.
${hasData ? 'Test data is available.' : 'No tests attempted yet.'}

STUDENT DATA:
${JSON.stringify(ctx)}
${ragSection}

${!hasData ? 'NOTE: No tests attempted yet. Encourage them to start.' : `NOTE: Student has taken ${ctx.total_tests} tests. Average: ${ctx.avg_score}%.`}`;
}

async function ollamaChatResponse(message, ctx, ragChunks = []) {
  const response = await ollama.chat({
    model: process.env.OLLAMA_MODEL || 'llama3:8b-instruct-q5_0',
    messages: [
      { role: 'system', content: createSystemPrompt(ctx, ragChunks) },
      { role: 'user', content: message },
    ],
    options: {
      temperature: 0.15,
      top_p: 0.9,
      num_predict: 350,
    },
  });

  return response.message.content;
}

function chatbotFallback(message) {
  const msg = message.toLowerCase().trim();
  if (/^(hi|hello|hey|hlo|hii|namaste|namaskar)/.test(msg)) {
    return 'Namaste! Main StudySync AI hun. Abhi AI service temporarily unavailable hai - thodi der baad try karo!';
  }
  return 'Maaf karo! AI service abhi temporarily down hai. Thodi der baad try karo ya page refresh karo.';
}

router.post('/chat', verifyToken, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message required' });
    }

    const data = await getStudentData(req.user.id);
    const recommendations = generateRecommendations(data);
    const ctx = buildContext(data, recommendations);

    let ragChunks = [];
    try {
      await ensureNotesSyncedForUser(req.user.id);
      ragChunks = await searchChunks({
        user_id: req.user.id,
        query: message,
        limit: 4,
        threshold: 0.3,
      });
    } catch (ragErr) {
      console.warn('RAG search failed (non-fatal):', ragErr.message);
    }

    let response;
    try {
      response = await ollamaChatResponse(message, ctx, ragChunks);
    } catch (ollamaErr) {
      console.error('Ollama unavailable:', ollamaErr.message);
      response = chatbotFallback(message);
    }

    res.json({ response });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
