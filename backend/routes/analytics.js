const router = require('express').Router();
const db = require('../config/db');
const verifyToken = require('../middleware/auth');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSnippet(content, terms = []) {
  const clean = String(content || '').replace(/\s+/g, ' ').trim();
  if (!clean) {
    return '';
  }

  const firstMatch = terms
    .filter(Boolean)
    .map((term) => {
      const regex = new RegExp(escapeRegExp(term), 'i');
      const match = clean.match(regex);
      return match ? match.index : -1;
    })
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  if (typeof firstMatch !== 'number') {
    return clean.slice(0, 180);
  }

  const start = Math.max(0, firstMatch - 70);
  const end = Math.min(clean.length, firstMatch + 110);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < clean.length ? '...' : '';

  return `${prefix}${clean.slice(start, end).trim()}${suffix}`;
}

async function findRelatedNotes(moduleId, topic, correctAnswer) {
  const { rows } = await db.query(
    `SELECT
       n.id,
       n.title,
       n.content,
       m.id AS module_id,
       m.module_name,
       s.name AS subject_name
     FROM notes n
     JOIN modules m ON m.id = n.module_id
     JOIN subjects s ON s.id = m.subject_id
     WHERE n.module_id = $1
     ORDER BY
       CASE
         WHEN lower(n.title) LIKE lower($2) THEN 0
         WHEN lower(n.content) LIKE lower($2) THEN 1
         WHEN lower(n.content) LIKE lower($3) THEN 2
         ELSE 3
       END,
       n.id ASC
     LIMIT 2`,
    [moduleId, `%${topic}%`, `%${correctAnswer}%`]
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    module_id: row.module_id,
    module_name: row.module_name,
    subject_name: row.subject_name,
    snippet: buildSnippet(row.content, [topic, correctAnswer]),
  }));
}

function buildWrongAnswerSupport(answer, relatedNotes) {
  const selected = answer.selected_answer || 'your selected option';

  if (relatedNotes.length > 0) {
    return {
      explanation: `"${answer.correct_answer}" sahi hai kyunki question ${answer.topic} ke core concept par based tha. Tumhara answer "${selected}" related lag sakta tha, lekin exact rule ya definition "${relatedNotes[0].title}" me clearer hai.`,
      study_hint: `Pehle "${relatedNotes[0].title}" revise karo, phir is topic ke 2 fresh questions attempt karo.`,
    };
  }

  return {
    explanation: `"${answer.correct_answer}" is question ka correct answer hai kyunki ye ${answer.topic} ke asked concept ko directly satisfy karta hai. "${selected}" choose karna usually tab hota hai jab concept aur example mix ho jate hain.`,
    study_hint: `Is topic ka definition + example ek saath revise karo aur phir question wording par dhyan do.`,
  };
}

function classifyMastery(attempts, accuracy) {
  if (attempts === 0) {
    return 'not_started';
  }

  if (accuracy >= 80 && attempts >= 2) {
    return 'strong';
  }

  if (accuracy < 50) {
    return 'shaky';
  }

  return 'learning';
}

// GET /api/analytics/summary — overall stats
router.get('/summary', verifyToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const { rows: summary } = await db.query(`
      SELECT
        COUNT(*)::int                                    as total_tests,
        COALESCE(AVG(percentage), 0)::numeric(5,2)      as avg_score,
        COALESCE(MAX(percentage), 0)::numeric(5,2)      as best_score,
        COUNT(CASE WHEN percentage >= 60 THEN 1 END)::int as passed,
        COUNT(CASE WHEN percentage < 60 THEN 1 END)::int  as failed
      FROM assessments
      WHERE user_id = $1
    `, [user_id]);

    const { rows: bySubject } = await db.query(`
      SELECT
        s.name                                        as subject_name,
        COUNT(*)::int                                 as total_tests,
        AVG(a.percentage)::numeric(5,2)               as avg_score
      FROM assessments a
      JOIN modules m ON m.id = a.module_id
      JOIN subjects s ON s.id = m.subject_id
      WHERE a.user_id = $1
      GROUP BY s.id, s.name
      ORDER BY avg_score DESC
    `, [user_id]);

    const { rows: topicMastery } = await db.query(`
      SELECT topic, accuracy::numeric(5,2), attempts
      FROM topic_mastery
      WHERE user_id = $1
      ORDER BY accuracy ASC
    `, [user_id]);

    const { rows: trend } = await db.query(`
      SELECT
        DATE(a.created_at)             as date,
        AVG(a.percentage)::numeric(5,2) as avg_score,
        COUNT(*)::int                   as tests_taken
      FROM assessments a
      WHERE a.user_id = $1
      GROUP BY DATE(a.created_at)
      ORDER BY date ASC
      LIMIT 30
    `, [user_id]);

    const { rows: allTopics } = await db.query(`
      SELECT
        s.id AS subject_id,
        s.name AS subject_name,
        q.topic
      FROM subjects s
      JOIN modules m ON m.subject_id = s.id
      JOIN questions q ON q.module_id = m.id
      GROUP BY s.id, s.name, q.topic
      ORDER BY s.name ASC, q.topic ASC
    `);

    const { rows: attemptedTopics } = await db.query(`
      SELECT
        s.id AS subject_id,
        q.topic,
        COUNT(*)::int AS attempts,
        AVG(CASE WHEN aa.is_correct THEN 100 ELSE 0 END)::numeric(5,2) AS accuracy
      FROM assessments a
      JOIN assessment_answers aa ON aa.assessment_id = a.id
      JOIN questions q ON q.id = aa.question_id
      JOIN modules m ON m.id = q.module_id
      JOIN subjects s ON s.id = m.subject_id
      WHERE a.user_id = $1
      GROUP BY s.id, q.topic
    `, [user_id]);

    const attemptedMap = new Map(
      attemptedTopics.map((row) => [
        `${row.subject_id}::${row.topic}`,
        {
          attempts: Number(row.attempts || 0),
          accuracy: Number(row.accuracy || 0),
        },
      ])
    );

    const masteryMapBySubject = new Map();

    for (const row of allTopics) {
      const key = `${row.subject_id}::${row.topic}`;
      const attempted = attemptedMap.get(key) || { attempts: 0, accuracy: 0 };
      const status = classifyMastery(attempted.attempts, attempted.accuracy);

      if (!masteryMapBySubject.has(row.subject_id)) {
        masteryMapBySubject.set(row.subject_id, {
          subject_id: row.subject_id,
          subject_name: row.subject_name,
          counts: {
            not_started: 0,
            learning: 0,
            shaky: 0,
            strong: 0,
          },
          topics: [],
        });
      }

      const subjectEntry = masteryMapBySubject.get(row.subject_id);
      subjectEntry.counts[status] += 1;
      subjectEntry.topics.push({
        topic: row.topic,
        attempts: attempted.attempts,
        accuracy: Number(attempted.accuracy.toFixed(2)),
        status,
      });
    }

    const masteryMap = Array.from(masteryMapBySubject.values()).map((subjectEntry) => ({
      ...subjectEntry,
      topics: subjectEntry.topics.sort((a, b) => {
        const statusOrder = {
          shaky: 0,
          learning: 1,
          not_started: 2,
          strong: 3,
        };

        return (
          statusOrder[a.status] - statusOrder[b.status] ||
          a.accuracy - b.accuracy ||
          a.topic.localeCompare(b.topic)
        );
      }),
    }));

    res.json({ summary: summary[0], bySubject, topicMastery, trend, masteryMap });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/results — full results list
router.get('/results', verifyToken, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        a.id,
        a.score,
        a.total_questions,
        a.percentage,
        a.created_at,
        m.module_name,
        s.name as subject_name,
        CASE WHEN a.percentage >= 60 THEN true ELSE false END as passed
      FROM assessments a
      JOIN modules m ON m.id = a.module_id
      JOIN subjects s ON s.id = m.subject_id
      WHERE a.user_id = $1
      ORDER BY a.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/results/:id — single result with question breakdown
router.get('/results/:id', verifyToken, async (req, res) => {
  try {
    const { rows: result } = await db.query(`
      SELECT
        a.id, a.score, a.total_questions, a.percentage, a.created_at,
        m.id AS module_id, m.module_name, s.name as subject_name,
        CASE WHEN a.percentage >= 60 THEN true ELSE false END as passed
      FROM assessments a
      JOIN modules m ON m.id = a.module_id
      JOIN subjects s ON s.id = m.subject_id
      WHERE a.id = $1 AND a.user_id = $2
    `, [req.params.id, req.user.id]);

    if (!result.length) return res.status(404).json({ error: 'Result not found' });

    const { rows: answers } = await db.query(`
      SELECT
        aa.question_id,
        aa.selected_answer,
        aa.is_correct,
        q.module_id,
        q.question,
        q.options,
        q.correct_answer,
        q.topic,
        q.difficulty
      FROM assessment_answers aa
      JOIN questions q ON q.id = aa.question_id
      WHERE aa.assessment_id = $1
      ORDER BY aa.id ASC
    `, [req.params.id]);

    const enrichedAnswers = await Promise.all(
      answers.map(async (answer) => {
        if (answer.is_correct) {
          return {
            ...answer,
            explanation: null,
            study_hint: null,
            related_notes: [],
          };
        }

        const relatedNotes = await findRelatedNotes(
          answer.module_id || result[0].module_id,
          answer.topic,
          answer.correct_answer
        );
        const support = buildWrongAnswerSupport(answer, relatedNotes);

        return {
          ...answer,
          explanation: support.explanation,
          study_hint: support.study_hint,
          related_notes: relatedNotes,
        };
      })
    );

    res.json({ ...result[0], answers: enrichedAnswers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
