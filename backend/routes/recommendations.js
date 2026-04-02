const router = require('express').Router();
const db = require('../config/db');
const verifyToken = require('../middleware/auth');
const { generateAnswer } = require('../lib/ollamaClient');
const { searchChunks } = require('../services/ragSearch');
const { ensureNotesSyncedForUser } = require('../services/ragNotes');
const { getRevisionQueue } = require('../services/topicReviewSchedule');

let initPromise;
const MAX_RAG_CHUNKS = 2;
const MAX_RAG_CHARS_PER_CHUNK = 700;

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

  const revisionQueue = await getRevisionQueue(user_id);

  return { assessments, topicMastery, studySessions, allModules, unlocks, flagged, revisionQueue };
}

function generateRecommendations(data) {
  const { assessments, topicMastery, studySessions, allModules, unlocks, flagged, revisionQueue } = data;

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
    revisionQueue,
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
  const { weakTopics, subjectPerformance, studyPlan, studyStats, nextModules, predictions, revisionQueue } = recommendations;

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
    revision_queue: revisionQueue,
    predictions,
    sessions_week: studyStats.sessions_this_week,
    avg_daily_mins: studyStats.avg_minutes_per_day,
    last_test: assessments[0] || null,
  };
}

function compactContextForPrompt(ctx) {
  return {
    total_tests: ctx.total_tests,
    avg_score: ctx.avg_score,
    weak_topics: ctx.weak_topics.slice(0, 3),
    strong_topics: ctx.strong_topics.slice(0, 4),
    subjects: ctx.subjects.slice(0, 3),
    study_plan: ctx.study_plan.slice(0, 3),
    next_modules: ctx.next_modules.slice(0, 2).map((module) => ({
      module_name: module.module_name,
      subject_name: module.subject_name,
      action: module.action,
      reason: module.reason,
    })),
    revision_queue: ctx.revision_queue.slice(0, 3).map((item) => ({
      topic: item.topic,
      accuracy: item.accuracy,
      priority: item.priority,
      reason: item.reason,
    })),
    predictions: ctx.predictions.slice(0, 2),
    sessions_week: ctx.sessions_week,
    avg_daily_mins: ctx.avg_daily_mins,
    last_test: ctx.last_test
      ? {
          module_name: ctx.last_test.module_name,
          subject_name: ctx.last_test.subject_name,
          percentage: ctx.last_test.percentage,
          created_at: ctx.last_test.created_at,
        }
      : null,
  };
}

function trimForPrompt(text, maxLength = MAX_RAG_CHARS_PER_CHUNK) {
  if (!text) return '';

  const clean = text
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, maxLength - 3).trim()}...`;
}

function createSystemPrompt(ctx, ragChunks = []) {
  const hasData = (ctx.total_tests || 0) > 0;
  const compactCtx = compactContextForPrompt(ctx);
  const ragSection = ragChunks.length > 0
    ? `\nRELEVANT STUDY MATERIAL:\n${ragChunks
        .slice(0, MAX_RAG_CHUNKS)
        .map((chunk, index) => `[${index + 1}] ${chunk.title}\n${trimForPrompt(chunk.chunk_text)}`)
        .join('\n\n')}`
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
5. Keep replies under 350 words. Use markdown with short headings and bullet points where helpful.
5a. When using markdown, keep it valid: put headings and bullet points on separate lines, and leave a blank line between sections.
5b. If you include code, commands, SQL, JSON, or config, wrap them in fenced code blocks and add a language label when possible.
6. Do NOT act as a general chatbot - you are a dashboard assistant only.
7. For topic/concept questions like "explain ACID properties", do NOT dump raw notes or note titles.
8. For topic/concept questions, answer in this structure:
   - Start with a short heading.
   - Give a 1-2 line definition/summary.
   - Explain the key points in 3-5 bullets.
   - Give one short example if useful.
9. Mention weak topics, study plan, or performance only when the user asks about progress/recommendations, not during pure concept explanations.
10. If multiple study-material chunks are available, merge them into one clean explanation in your own words.
${hasData ? 'Test data is available.' : 'No tests attempted yet.'}

STUDENT DATA:
${JSON.stringify(compactCtx)}
${ragSection}

${!hasData ? 'NOTE: No tests attempted yet. Encourage them to start.' : `NOTE: Student has taken ${ctx.total_tests} tests. Average: ${ctx.avg_score}%.`}`;
}

async function ollamaChatResponse(message, ctx, ragChunks = []) {
  return generateAnswer(
    [
      { role: 'system', content: createSystemPrompt(ctx, ragChunks) },
      { role: 'user', content: message },
    ],
    {
      model: process.env.OLLAMA_CHAT_MODEL || process.env.OLLAMA_MODEL || 'llama3:latest',
      ollamaOptions: {
        temperature: 0.1,
        top_p: 0.85,
        num_ctx: 2048,
        num_predict: 280,
      },
    }
  );
}

function summarizeChunkText(text, maxLength = 220) {
  if (!text) return '';

  const clean = text
    .replace(/\s+/g, ' ')
    .replace(/[#>*`_-]/g, ' ')
    .trim();

  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, maxLength - 3).trim()}...`;
}

function formatBulletLines(items) {
  return items.filter(Boolean).map((item) => `- ${item}`);
}

function buildOfflineChatResponse(message, ctx, ragChunks = []) {
  const msg = message.toLowerCase().trim();

  if (/^(hi|hello|hey|hlo|hii|namaste|namaskar)/.test(msg)) {
    const intro = ['Namaste! Main aapke dashboard data ke basis par help kar raha hun.'];

    if (ctx.total_tests > 0) {
      intro.push(`Aapne ab tak ${ctx.total_tests} tests diye hain aur average ${ctx.avg_score}% hai.`);
    } else {
      intro.push('Abhi tak test data nahi hai, lekin main aapko next study steps bata sakta hun.');
    }

    intro.push('Aap pooch sakte ho: "Mujhe kya padhna chahiye?", "Study plan do", ya "Meri weak topics kaunsi hain?"');
    return intro.join(' ');
  }

  if (ragChunks.length > 0 && /(kya hai|what is|explain|samjha|define|difference|kaise|kyu|kyon|topic|concept)/.test(msg)) {
    const primaryChunk = ragChunks[0];
    const noteLines = [
      '**Relevant Notes Summary**',
      primaryChunk ? `Topic ke liye sabse relevant note: **${primaryChunk.title}**.` : null,
      primaryChunk ? summarizeChunkText(primaryChunk.chunk_text, 320) : null,
      '',
      'Detailed Llama explanation abhi generate nahi ho payi. Backend inference recover hote hi answer aur structured milega.',
    ];

    return noteLines.join('\n');
  }

  if (/(weak|kamzor|weak topic|topics|improve|improvement)/.test(msg)) {
    if (ctx.weak_topics.length === 0) {
      return 'Abhi weak topics detect nahi hue. Aur tests do taki main better gap analysis de sakun.';
    }

    return [
      'Aapki current weak topics ye hain:',
      ...formatBulletLines(ctx.weak_topics.slice(0, 4).map((topic) => `${topic.topic} - ${topic.accuracy}% accuracy (${topic.priority} priority)`)),
      'Inme se top 1-2 topics ko pehle revise karo, fir mini test ya practice questions do.',
    ].join('\n');
  }

  if (/(study plan|plan|schedule|routine|padhna chahiye|kya padhna|next|recommend)/.test(msg)) {
    const planLines = [];

    if (ctx.study_plan.length > 0) {
      planLines.push('Aapke liye best next steps:');
      planLines.push(...formatBulletLines(ctx.study_plan.slice(0, 4).map((item) => `${item.day}: ${item.focus} - ${item.activity} (${item.duration})`)));
    }

    if (ctx.next_modules.length > 0) {
      const nextModule = ctx.next_modules[0];
      planLines.push(`Sabse pehle "${nextModule.module_name}" par kaam karo. Reason: ${nextModule.reason}.`);
    }

    if (planLines.length > 0) {
      return planLines.join('\n');
    }
  }

  if (/(performance|score|result|progress|analysis|kaisa hai|kaisi hai)/.test(msg)) {
    const perfLines = [];

    if (ctx.total_tests > 0) {
      perfLines.push(`Overall aapne ${ctx.total_tests} tests diye hain aur average score ${ctx.avg_score}% hai.`);
    } else {
      perfLines.push('Abhi tak koi test attempt nahi hua, isliye performance trend available nahi hai.');
    }

    if (ctx.subjects.length > 0) {
      perfLines.push('Subject-wise snapshot:');
      perfLines.push(...formatBulletLines(ctx.subjects.slice(0, 3).map((subject) => `${subject.subject} - ${subject.avg_score}% avg (${subject.trend})`)));
    }

    if (ctx.sessions_week > 0 || ctx.avg_daily_mins > 0) {
      perfLines.push(`Is week ${ctx.sessions_week} study sessions hue aur average ${ctx.avg_daily_mins} mins/day raha.`);
    }

    return perfLines.join('\n');
  }

  if (/(motivate|motivation|demotivate|tired|stress|give up)/.test(msg)) {
    const topic = ctx.weak_topics[0]?.topic;
    const moduleName = ctx.next_modules[0]?.module_name;
    return [
      'Aapka progress slow ho sakta hai, but stuck hona normal hai.',
      topic ? `Aaj bas ek kaam karo: ${topic} ko 45 minutes revise karo.` : 'Aaj bas ek focused 45 minute session complete karo.',
      moduleName ? `Uske baad "${moduleName}" ka next step complete karo.` : 'Fir ek short practice test de do.',
      'Consistency perfect hone se zyada important hai.',
    ].join('\n');
  }

  const summaryLines = [];

  if (ctx.total_tests > 0) {
    summaryLines.push(`Aapka current average ${ctx.avg_score}% hai across ${ctx.total_tests} tests.`);
  } else {
    summaryLines.push('Abhi tak enough test data nahi hai for deep analysis.');
  }

  if (ctx.weak_topics.length > 0) {
    summaryLines.push(`Sabse important focus area: ${ctx.weak_topics[0].topic} (${ctx.weak_topics[0].accuracy}% accuracy).`);
  }

  if (ctx.next_modules.length > 0) {
    summaryLines.push(`Next recommended module: ${ctx.next_modules[0].module_name} - ${ctx.next_modules[0].reason}.`);
  }

  if (summaryLines.length === 0) {
    summaryLines.push('Thoda aur data aane do, phir main better recommendations de paunga.');
  }

  summaryLines.push('Agar chaho to mujhse study plan, weak topics, ya performance analysis directly pooch sakte ho.');
  return summaryLines.join('\n');
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
        limit: MAX_RAG_CHUNKS,
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
      response = buildOfflineChatResponse(message, ctx, ragChunks);
    }

    res.json({ response });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
