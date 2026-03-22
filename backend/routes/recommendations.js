const router = require('express').Router();
const db     = require('../config/db');
const verifyToken = require('../middleware/auth');

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

  // ── Weak topics (accuracy < 60%) ──
  const weakTopics = topicMastery
    .filter(t => parseFloat(t.accuracy) < 60)
    .map(t => ({
      topic:    t.topic,
      accuracy: parseFloat(t.accuracy),
      attempts: t.attempts,
      priority: parseFloat(t.accuracy) < 40 ? "high" : "medium",
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  // ── Subject performance ──
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
      subject:    name,
      avg_score:  Math.round(avg),
      tests:      data.scores.length,
      trend:      data.scores.length >= 2
        ? data.scores[0] > data.scores[1] ? "improving" : "declining"
        : "stable",
    };
  }).sort((a, b) => a.avg_score - b.avg_score);

  // ── Next modules to study ──
  const unlockedIds  = new Set(unlocks.map(u => u.module_id));
  const flaggedIds   = new Set(flagged.map(f => f.module_id));
  const testedModIds = new Set(assessments.map(a => a.module_id));

  const nextModules = allModules
    .filter(m => unlockedIds.has(m.id) || m.id <= Math.min(...allModules.map(x => x.id)) + 1)
    .filter(m => !testedModIds.has(m.id) || flaggedIds.has(m.id))
    .slice(0, 4)
    .map(m => ({
      id:           m.id,
      module_name:  m.module_name,
      subject_name: m.subject_name,
      difficulty:   m.difficulty,
      flagged:      flaggedIds.has(m.id),
      reason:       flaggedIds.has(m.id)
        ? "Flagged — needs review"
        : "Not yet tested",
    }));

  // ── Study session frequency ──
  const recentSessions = studySessions.filter(s => {
    const d = new Date(s.date || s.session_date);
    return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
  });
  const avgMinutesPerDay = recentSessions.reduce((s, ss) => s + (ss.duration_minutes || 0), 0) / 7;

  // ── Score prediction ──
  const predictions = weakTopics.slice(0, 3).map(t => {
    const improvement = t.accuracy < 40 ? 20 : t.accuracy < 60 ? 12 : 6;
    return {
      topic:            t.topic,
      current_accuracy: t.accuracy,
      predicted_gain:   improvement,
      predicted_score:  Math.min(100, Math.round(t.accuracy + improvement)),
    };
  });

  // ── Personalized study plan ──
  const studyPlan = [];

  // Day 1-2: weakest topics
  if (weakTopics.length > 0) {
    studyPlan.push({
      day:      "Day 1-2",
      focus:    weakTopics[0].topic,
      activity: "Revise notes and re-attempt questions",
      duration: "45-60 min",
      priority: "high",
    });
  }

  // Day 3-4: second weakest or flagged module
  if (weakTopics.length > 1) {
    studyPlan.push({
      day:      "Day 3-4",
      focus:    weakTopics[1].topic,
      activity: "Practice questions and mini test",
      duration: "45 min",
      priority: "medium",
    });
  }

  // Day 5: next module
  if (nextModules.length > 0) {
    studyPlan.push({
      day:      "Day 5",
      focus:    nextModules[0].module_name,
      activity: "Start new module — read notes",
      duration: "60 min",
      priority: "medium",
    });
  }

  // Day 6-7: revision + test
  studyPlan.push({
    day:      "Day 6-7",
    focus:    subjectPerformance[0]?.subject || "All subjects",
    activity: "Full subject test — track improvement",
    duration: "30-45 min",
    priority: "low",
  });

  return {
    weakTopics,
    subjectPerformance,
    nextModules,
    predictions,
    studyPlan,
    studyStats: {
      avg_minutes_per_day: Math.round(avgMinutesPerDay),
      sessions_this_week:  recentSessions.length,
      total_tests:         assessments.length,
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

// ── Chatbot Engine ────────────────────────────────────────

function buildContext(data, recommendations) {
  const { assessments, topicMastery, studySessions } = data;
  const { weakTopics, subjectPerformance, studyPlan, studyStats } = recommendations;

  return {
    total_tests:    assessments.length,
    avg_score:      assessments.length
      ? Math.round(assessments.reduce((s, a) => s + parseFloat(a.percentage), 0) / assessments.length)
      : 0,
    weak_topics:    weakTopics.map(t => t.topic),
    strong_topics:  topicMastery.filter(t => parseFloat(t.accuracy) >= 75).map(t => t.topic),
    subjects:       subjectPerformance,
    study_plan:     studyPlan,
    sessions_week:  studyStats.sessions_this_week,
    avg_daily_mins: studyStats.avg_minutes_per_day,
    last_test:      assessments[0] || null,
  };
}

function chatbotResponse(message, ctx) {
  const msg = message.toLowerCase().trim();

  // ── Greetings ──
  if (/^(hi|hello|hey|hlo|hii|namaste|namaskar)/.test(msg)) {
    return `Namaste! 👋 Main aapka StudySync AI assistant hun. Aap mujhse pooch sakte ho:
- "Mujhe kya padhna chahiye?"
- "Meri weak topics kaunsi hain?"
- "Mera DBMS kaisa chal raha hai?"
- "Mujhe study plan do"
- "Mera score improve kaise hoga?"`;
  }

  // ── Study plan ──
  if (/study.?plan|plan.?do|schedule|kya.?padhun|kaise.?padhu|padhai|timetable/.test(msg)) {
    if (!ctx.study_plan.length) {
      return "Abhi tak koi test nahi diya hai. Pehle kuch tests do, phir main aapke liye personalized plan bana sakta hun! 📚";
    }
    let response = "📅 **Aapka Personalized Study Plan:**\n\n";
    ctx.study_plan.forEach(p => {
      const emoji = p.priority === "high" ? "🔴" : p.priority === "medium" ? "🟡" : "🟢";
      response += `${emoji} **${p.day}** — ${p.focus}\n`;
      response += `   → ${p.activity} (${p.duration})\n\n`;
    });
    return response;
  }

  // ── Weak topics ──
  if (/weak|kamzor|problem|struggle|difficult|mushkil|improvement/.test(msg)) {
    if (!ctx.weak_topics.length) {
      return "Bahut achha! 🎉 Abhi tak koi topic weak nahi dikh raha. Keep it up! Regular tests dete raho.";
    }
    let response = `⚠️ **Aapki weak topics** (accuracy < 60%):\n\n`;
    ctx.weak_topics.forEach((t, i) => {
      response += `${i + 1}. **${t}** — inhe revise karo priority pe\n`;
    });
    response += `\n💡 **Tip:** Inhe notes se padhkar mini test do. Har topic pe 30-45 min do.`;
    return response;
  }

  // ── Strong topics ──
  if (/strong|accha|best|top|good|achha|badhiya/.test(msg)) {
    if (!ctx.strong_topics.length) {
      return "Abhi strong topics define karne ke liye zyada data chahiye. Aur tests do! 💪";
    }
    let response = `✅ **Aapki strong topics:**\n\n`;
    ctx.strong_topics.slice(0, 5).forEach((t, i) => {
      response += `${i + 1}. ${t}\n`;
    });
    return response;
  }

  // ── Subject specific ──
  if (/dbms|database/.test(msg)) {
    const s = ctx.subjects.find(s => s.subject.toLowerCase().includes("database"));
    if (!s) return "DBMS mein abhi koi test nahi diya. Jao DBMS test do! 📖";
    return `📊 **DBMS Performance:**\n\nAverage score: **${s.avg_score}%**\nTests diye: **${s.tests}**\nTrend: **${s.trend === "improving" ? "📈 Improve ho raha hai" : s.trend === "declining" ? "📉 Thoda decline hai" : "➡️ Stable hai"}**\n\n${s.avg_score < 60 ? "⚠️ DBMS par zyada dhyan do — weak area hai." : s.avg_score < 80 ? "👍 Achha chal raha hai, aur practice karo." : "🎉 DBMS mein bahut achha kar rahe ho!"}`;
  }

  if (/os|operating system/.test(msg)) {
    const s = ctx.subjects.find(s => s.subject.toLowerCase().includes("operating"));
    if (!s) return "OS mein abhi koi test nahi diya. OS test do! 💻";
    return `📊 **OS Performance:**\n\nAverage score: **${s.avg_score}%**\nTests diye: **${s.tests}**\nTrend: **${s.trend === "improving" ? "📈 Improve ho raha hai" : s.trend === "declining" ? "📉 Decline hai" : "➡️ Stable"}**\n\n${s.avg_score < 60 ? "⚠️ OS par focus karo." : "👍 OS achha chal raha hai!"}`;
  }

  if (/cn|computer network|network/.test(msg)) {
    const s = ctx.subjects.find(s => s.subject.toLowerCase().includes("network"));
    if (!s) return "CN mein abhi koi test nahi diya. CN test do! 🌐";
    return `📊 **CN Performance:**\n\nAverage score: **${s.avg_score}%**\nTests diye: **${s.tests}**`;
  }

  if (/dsa|data structure|algorithm/.test(msg)) {
    const s = ctx.subjects.find(s => s.subject.toLowerCase().includes("data"));
    if (!s) return "DSA mein abhi test nahi diya. DSA test do! 🧮";
    return `📊 **DSA Performance:**\n\nAverage score: **${s.avg_score}%**\nTests diye: **${s.tests}**`;
  }

  // ── Overall performance ──
  if (/performance|overall|score|result|kaisa|kitna|progress/.test(msg)) {
    if (ctx.total_tests === 0) {
      return "Abhi tak koi test nahi diya! 😊 Pehle kuch tests do phir main aapki progress bataunga.";
    }
    const emoji = ctx.avg_score >= 80 ? "🏆" : ctx.avg_score >= 60 ? "👍" : "💪";
    return `${emoji} **Aapki Overall Performance:**\n\nTotal tests: **${ctx.total_tests}**\nAverage score: **${ctx.avg_score}%**\n${ctx.last_test ? `Last test: **${ctx.last_test.module_name}** — ${ctx.last_test.percentage}%` : ""}\n\n${ctx.avg_score >= 80 ? "Bahut badhiya! Keep it up! 🎉" : ctx.avg_score >= 60 ? "Achha chal raha hai, aur improve kar sakte ho!" : "Mehnat karo, improvement aayegi! Weak topics pe focus karo."}`;
  }

  // ── Study habits ──
  if (/study.?habit|session|kitna.?padh|time|kitni.?der|din mein/.test(msg)) {
    if (ctx.sessions_week === 0) {
      return "Is hafte koi study session schedule nahi kiya! 😬 Planner mein sessions add karo aur regular padhai karo.";
    }
    return `📚 **Aapki Study Habits:**\n\nIs hafte sessions: **${ctx.sessions_week}**\nRoz average: **${ctx.avg_daily_mins} minutes**\n\n${ctx.avg_daily_mins >= 60 ? "🎉 Bahut achha! Consistent padhai kar rahe ho." : ctx.avg_daily_mins >= 30 ? "👍 Theek hai, thoda aur badha sakte ho." : "⚠️ Aur zyada padhna chahiye. Kam se kam 45-60 min roz."}`;
  }

  // ── Score prediction ──
  if (/predict|improve|agar.?padhu|kitna.?badhega|score.?badhega|gain/.test(msg)) {
    if (!ctx.weak_topics.length) {
      return "Aapki accuracy already kaafi achhi hai! Consistent raho aur regular tests dete raho. 🎯";
    }
    return `🔮 **Score Prediction:**\n\nAgar aap **${ctx.weak_topics[0]}** achhe se padho:\n→ Expected improvement: **+15-20%**\n\nAgar aap **top 3 weak topics** cover karo:\n→ Overall score could reach: **${Math.min(100, ctx.avg_score + 20)}%**\n\n💡 Consistency se padho, results zaroor aayenge!`;
  }

  // ── Motivation ──
  if (/motivat|tired|thak|bore|help|mushkil|tough|hard|frustrat/.test(msg)) {
    const quotes = [
      "💪 'Mehnat ka fal meetha hota hai' — Thoda aur, success paas hai!",
      "🌟 Har expert pehle beginner tha. Keep going!",
      "📈 Aap already bahut achha kar rahe ho. Ek ek topic karo, sab ho jayega.",
      "🎯 Focus on progress, not perfection. Har test se kuch seekhte ho.",
    ];
    return quotes[Math.floor(Math.random() * quotes.length)] +
      "\n\n" + (ctx.weak_topics.length ? `Aaj **${ctx.weak_topics[0]}** topic pe focus karo — yahi sabse zyada improvement dega! 📚` : "Aaj ek test do aur dekho kitna improve hua hai!");
  }

  // ── What to study next ──
  if (/kya.?padhu|next|aage|baad|suggest|recommendation|batao/.test(msg)) {
    if (!ctx.weak_topics.length && !ctx.subjects.length) {
      return "Pehle kuch tests do! Phir main aapko best suggest kar sakta hun. 😊";
    }
    let response = "📚 **Aaj Kya Padhein:**\n\n";
    if (ctx.weak_topics.length) {
      response += `🔴 **Priority 1:** ${ctx.weak_topics[0]} revise karo — yeh sabse weak area hai\n\n`;
    }
    if (ctx.weak_topics.length > 1) {
      response += `🟡 **Priority 2:** ${ctx.weak_topics[1]} ke questions practice karo\n\n`;
    }
    if (ctx.subjects.length) {
      const worst = ctx.subjects[0];
      response += `🟠 **Focus Subject:** ${worst.subject} — average ${worst.avg_score}% hai, improve karna hai\n\n`;
    }
    response += "💡 **Tip:** 25-min Pomodoro technique use karo — padho, break lo, repeat!";
    return response;
  }

  // ── Default ──
  return `Hmm, samajh nahi aaya! 🤔 Aap ye pooch sakte ho:\n\n- "Mujhe kya padhna chahiye?"\n- "Meri weak topics kaunsi hain?"\n- "Mera overall performance kaisa hai?"\n- "Mujhe study plan do"\n- "DBMS mein kaisa chal raha hai?"\n- "Agar padhu toh score kitna badhega?"\n- "Mujhe motivate karo" 😄`;
}

// POST /api/recommendations/chat
router.post('/chat', verifyToken, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

    const data            = await getStudentData(req.user.id);
    const recommendations = generateRecommendations(data);
    const ctx             = buildContext(data, recommendations);
    const response        = chatbotResponse(message, ctx);

    res.json({ response });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;