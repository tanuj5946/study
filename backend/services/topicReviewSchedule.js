const db = require('../config/db');

let initPromise;

function ensureTopicReviewTable() {
  if (!initPromise) {
    initPromise = db.query(`
      CREATE TABLE IF NOT EXISTS topic_review_schedule (
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        topic character varying(100) NOT NULL,
        last_module_id integer NULL REFERENCES modules(id) ON DELETE SET NULL,
        last_accuracy numeric(5,2) NOT NULL DEFAULT 0,
        interval_days integer NOT NULL DEFAULT 1,
        streak integer NOT NULL DEFAULT 0,
        due_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_reviewed_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, topic)
      )
    `);
  }

  return initPromise;
}

function clampInterval(days) {
  return Math.max(1, Math.min(21, Math.round(days)));
}

function buildSchedule(existingRow, accuracy, now = new Date()) {
  const previousInterval = Number(existingRow?.interval_days || 1);
  const previousStreak = Number(existingRow?.streak || 0);

  let intervalDays;
  let streak;
  let dueAt;
  let priority;
  let reason;

  if (accuracy < 50) {
    intervalDays = 1;
    streak = 0;
    dueAt = now;
    priority = 'high';
    reason = 'Low recent accuracy';
  } else if (accuracy < 75) {
    intervalDays = 2;
    streak = Math.max(0, previousStreak - 1);
    dueAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    priority = 'medium';
    reason = 'Needs one more revision pass';
  } else {
    intervalDays = clampInterval(previousInterval * 2);
    streak = previousStreak + 1;
    dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    priority = 'low';
    reason = 'Doing well, revise later';
  }

  return {
    intervalDays,
    streak,
    dueAt,
    priority,
    reason,
  };
}

async function updateTopicReviewSchedule(client, userId, topicReviews) {
  await ensureTopicReviewTable();

  for (const review of topicReviews) {
    const { rows: existingRows } = await client.query(
      `SELECT interval_days, streak
       FROM topic_review_schedule
       WHERE user_id = $1 AND topic = $2`,
      [userId, review.topic]
    );

    const schedule = buildSchedule(existingRows[0], review.accuracy);

    await client.query(
      `INSERT INTO topic_review_schedule (
         user_id,
         topic,
         last_module_id,
         last_accuracy,
         interval_days,
         streak,
         due_at,
         last_reviewed_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, topic) DO UPDATE SET
         last_module_id = EXCLUDED.last_module_id,
         last_accuracy = EXCLUDED.last_accuracy,
         interval_days = EXCLUDED.interval_days,
         streak = EXCLUDED.streak,
         due_at = EXCLUDED.due_at,
         last_reviewed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        review.topic,
        review.module_id ?? null,
        review.accuracy,
        schedule.intervalDays,
        schedule.streak,
        schedule.dueAt,
      ]
    );
  }
}

async function getRevisionQueue(userId) {
  await ensureTopicReviewTable();

  const { rows } = await db.query(
    `SELECT
       trs.topic,
       trs.last_accuracy,
       trs.interval_days,
       trs.streak,
       trs.due_at,
       trs.last_module_id,
       m.module_name,
       s.name AS subject_name
     FROM topic_review_schedule trs
     LEFT JOIN modules m ON m.id = trs.last_module_id
     LEFT JOIN subjects s ON s.id = m.subject_id
     WHERE trs.user_id = $1
     ORDER BY
       CASE
         WHEN trs.due_at <= CURRENT_TIMESTAMP THEN 0
         ELSE 1
       END,
       trs.last_accuracy ASC,
       trs.due_at ASC
     LIMIT 6`,
    [userId]
  );

  const now = Date.now();

  return rows.map((row) => {
    const dueAt = new Date(row.due_at);
    const overdueByHours = Math.max(0, Math.floor((now - dueAt.getTime()) / (60 * 60 * 1000)));
    const accuracy = Number(row.last_accuracy || 0);

    let priority = 'low';
    let reason = 'Scheduled spaced revision';

    if (dueAt.getTime() <= now && accuracy < 50) {
      priority = 'high';
      reason = 'Overdue and accuracy is still weak';
    } else if (dueAt.getTime() <= now) {
      priority = 'medium';
      reason = 'Due for spaced revision';
    } else if (accuracy < 60) {
      priority = 'medium';
      reason = 'Accuracy still needs reinforcement';
    }

    return {
      topic: row.topic,
      accuracy,
      interval_days: Number(row.interval_days || 1),
      streak: Number(row.streak || 0),
      due_at: dueAt.toISOString(),
      overdue_hours: overdueByHours,
      priority,
      reason,
      module_id: row.last_module_id,
      module_name: row.module_name,
      subject_name: row.subject_name,
    };
  });
}

module.exports = {
  ensureTopicReviewTable,
  updateTopicReviewSchedule,
  getRevisionQueue,
};
