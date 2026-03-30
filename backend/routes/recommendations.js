const router = require('express').Router();
const db = require('../config/db');
const verifyToken = require('../middleware/auth');
// const { Ollama } = require('ollama');
const { ollama } = require('../lib/ollamaClient');
const { searchChunks } = require('../services/ragSearch'); // ✅ named import

// ✅ Initialize with host — this is what was broken before
const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || 'http://localhost:11434',
});

// ── Recommendation Engine ─────────────────────────────────

async function getStudentData(user_id) {
  const { rows: assessments } = await db.query(`
    SELECT a.*, m.module_name, s.name as subject_name, m.subject_id
    FROM assessments a
    JOIN modules m ON m.id = a.module_id
    JOIN subjects s ON s.id = m.subject_id
    WHERE a.user_id = $1
    ORDER BY a.created_at DESC
  `, [user_id]);

  const { rows: topicMastery } = await db.query(`
    SELECT * FROM topic_mastery WHERE user_id = $1
    ORDER BY accuracy ASC
  `, [user_id]);

  const { rows: studySessions } = await db.query(`
    SELECT ss.*, m.module_name, s.name as subject_name
    FROM study_sessions ss
    LEFT JOIN modules m ON m.id = ss.module_id
    LEFT JOIN subjects s ON s.id = m.subject_id
    WHERE ss.user_id = $1
    ORDER BY ss.date DESC
    LIMIT 30
  `, [user_id]);

  const { rows: allModules } = await db.query(`
    SELECT m.*, s.name as subject_name
    FROM modules m
    JOIN subjects s ON s.id = m.subject_id
    ORDER BY m.subject_id, m.id
  `, []);

  const { rows: unlocks } = await db.query(`
    SELECT module_id FROM module_unlocks WHERE user_id = $1
  `, [user_id]);

  const { rows: flagged } = await db.query(`
    SELECT DISTINCT module_id FROM mini_test_attempts
    WHERE user_id = $1 AND flagged = true
  `, [user_id]);

  return { assessments, topicMastery, studySessions, allModules, unlocks, flagged };
}

function generateRecommendations(data) {
  const { assessments, topicMastery, studySessions, allModules, unlocks, flagged } = data;

  const weakTopics = topicMastery
    .filter(t => parseFloat(t.accuracy) < 60)
    .map(t => ({
      topic: t.topic,
      accuracy: parseFloat(t.accuracy),
      attempts: t.attempts,
      priority: parseFloat(t.accuracy) < 40 ? "high" : "medium",
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  const subjectMap = {};
  assessments.forEach(a => {
    if (!subjectMap[a.subject_name]) {
      subjectMap[a.subject_name] = { scores: [], subject_id: a.subject_id };
    }
    subjectMap[a.subject_name].scores.push(parseFloat(a.percentage));
  });

  const subjectPerformance = Object.entries(subjectMap).map(([name, data]) => {
    const avg = data.scores.reduce((s, v) => s + v, 0) / data.scores.length;
    return {
      subject: name,
      avg_score: Math.round(avg),
      tests: data.scores.length,
      trend: data.scores.length >= 2
        ? data.scores[0] > data.scores[1] ? "improving" : "declining"
        : "stable",
    };
  }).sort((a, b) => a.avg_score - b.avg_score);

  const unlockedIds = new Set(unlocks.map(u => u.module_id));
  const flaggedIds = new Set(flagged.map(f => f.module_id));
  const testedModIds = new Set(assessments.map(a => a.module_id));
  const minModuleId = allModules.length ? Math.min(...allModules.map(x => x.id)) : 0;

  const nextModules = allModules
    .filter(m => unlockedIds.has(m.id) || m.id <= minModuleId + 1)
    .filter(m => !testedModIds.has(m.id) || flaggedIds.has(m.id))
    .slice(0, 4)
    .map(m => ({
      id: m.id,
      module_name: m.module_name,
      subject_name: m.subject_name,
      difficulty: m.difficulty,
      flagged: flaggedIds.has(m.id),
      reason: flaggedIds.has(m.id) ? "Flagged — needs review" : "Not yet tested",
    }));

  const recentSessions = studySessions.filter(s => {
    const d = new Date(s.date || s.session_date);
    return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
  });

  const avgMinutesPerDay =
    recentSessions.reduce((s, ss) => s + (ss.duration_minutes || 0), 0) / 7;

  const predictions = weakTopics.slice(0, 3).map(t => {
    const improvement = t.accuracy < 40 ? 20 : t.accuracy < 60 ? 12 : 6;
    return {
      topic: t.topic,
      current_accuracy: t.accuracy,
      predicted_gain: improvement,
      predicted_score: Math.min(100, Math.round(t.accuracy + improvement)),
    };
  });

  const studyPlan = [];
  if (weakTopics.length > 0) {
    studyPlan.push({
      day: "Day 1-2", focus: weakTopics[0].topic,
      activity: "Revise notes and re-attempt questions",
      duration: "45-60 min", priority: "high",
    });
  }
  if (weakTopics.length > 1) {
    studyPlan.push({
      day: "Day 3-4", focus: weakTopics[1].topic,
      activity: "Practice questions and mini test",
      duration: "45 min", priority: "medium",
    });
  }
  if (nextModules.length > 0) {
    studyPlan.push({
      day: "Day 5", focus: nextModules[0].module_name,
      activity: "Start new module — read notes",
      duration: "60 min", priority: "medium",
    });
  }
  studyPlan.push({
    day: "Day 6-7",
    focus: subjectPerformance[0]?.subject || "All subjects",
    activity: "Full subject test — track improvement",
    duration: "30-45 min", priority: "low",
  });

  return {
    weakTopics, subjectPerformance, nextModules, predictions, studyPlan,
    studyStats: {
      avg_minutes_per_day: Math.round(avgMinutesPerDay),
      sessions_this_week: recentSessions.length,
      total_tests: assessments.length,
    },
  };
}

// GET /api/recommendations
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

// ── Context Builder ───────────────────────────────────────

function buildContext(data, recommendations) {
  const { assessments, topicMastery } = data;
  const { weakTopics, subjectPerformance, studyPlan, studyStats, nextModules, predictions } = recommendations;

  return {
    total_tests: assessments.length,
    avg_score: assessments.length
      ? Math.round(assessments.reduce((s, a) => s + parseFloat(a.percentage), 0) / assessments.length)
      : 0,
    weak_topics: weakTopics.map(t => ({ topic: t.topic, accuracy: t.accuracy, priority: t.priority })),
    strong_topics: topicMastery.filter(t => parseFloat(t.accuracy) >= 75).map(t => t.topic),
    subjects: subjectPerformance,
    study_plan: studyPlan,
    next_modules: nextModules,
    predictions,
    sessions_week: studyStats.sessions_this_week,
    avg_daily_mins: studyStats.avg_minutes_per_day,
    last_test: assessments[0] || null,
  };
}

// ── System Prompt ─────────────────────────────────────────
function createSystemPrompt(ctx) {
  const hasData = (ctx.total_tests || 0) > 0;

  return `You are StudySync AI, an academic assistant for engineering students in India.

RULES:
- Reply in natural Hinglish.
- Keep responses clear, short, and useful.
- Use only STUDENT DATA.
- Never invent missing details.
- If data is missing, say: "Yeh data abhi available nahi hai."
- Follow ctx.user_intent first if present.
- Do not greet unless the student message is only a greeting.
- If it is a direct study question, start with the answer immediately.
- Use bullets when helpful.
- Keep response under 250 words.

OUTPUT:
- greeting -> short greeting + 4-5 things they can ask
- motivation -> short message + 1 action today
- study_plan -> day-wise from study_plan only
- weak_topics -> from weak_topics only
- subject_performance -> from subjects only
- predictions -> from predictions only
- no data -> ask student to take a test first

${hasData ? "Test data is available." : "No tests attempted yet."}

STUDENT DATA:
${JSON.stringify(ctx)}`;
}



// ── Ollama Chat ───────────────────────────────────────────

async function ollamaChatResponse(message, ctx) {
  const response = await ollama.chat({
model: process.env.OLLAMA_MODEL || 'llama3:8b-instruct-q5_0',
    messages: [
      { role: 'system', content: createSystemPrompt(ctx) },
      { role: 'user', content: message },
    ],
    options: {
      temperature: 0.15,   // slightly creative but grounded
      top_p: 0.9,
      num_predict: 350,   // ~200 words buffer
    },
  });

  return response.message.content;
}

// ── Fallback (rule-based) — only used if Ollama is down ──

function chatbotFallback(message) {
  const msg = message.toLowerCase().trim();
  if (/^(hi|hello|hey|hlo|hii|namaste|namaskar)/.test(msg)) {
    return "Namaste! 👋 Main StudySync AI hun. Abhi AI service temporarily unavailable hai — thodi der baad try karo!";
  }
  return "Maaf karo! 😅 AI service abhi temporarily down hai. Thodi der baad try karo ya page refresh karo.";
}

// ── POST /api/recommendations/chat ───────────────────────

router.post('/chat', verifyToken, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message required' });
    }

    const data = await getStudentData(req.user.id);
    const recommendations = generateRecommendations(data);
    const ctx = buildContext(data, recommendations);

    let response;
    try {
      // ✅ All messages go through Ollama now
      response = await ollamaChatResponse(message, ctx);
    } catch (ollamaErr) {
      // Ollama is down or model not loaded — use fallback
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