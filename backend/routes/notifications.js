const router = require('express').Router();
const db = require('../config/db');
const verifyToken = require('../middleware/auth');

const DEFAULT_PREFERENCES = {
  email_notifications: true,
  study_reminders: true,
  weekly_digest: false,
  progress_alerts: true,
};

const SESSION_MILESTONES = [1, 5, 10, 25, 50, 100];
const TEST_MILESTONES = [1, 5, 10, 25, 50];

let initPromise;

function ensureNotificationTables() {
  if (!initPromise) {
    initPromise = Promise.all([
      db.query(`
        CREATE TABLE IF NOT EXISTS notification_preferences (
          user_id integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          email_notifications boolean NOT NULL DEFAULT true,
          study_reminders boolean NOT NULL DEFAULT true,
          weekly_digest boolean NOT NULL DEFAULT false,
          progress_alerts boolean NOT NULL DEFAULT true,
          created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `),
      db.query(`
        CREATE TABLE IF NOT EXISTS notification_reads (
          user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          notification_id text NOT NULL,
          read_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, notification_id)
        )
      `),
    ]);
  }

  return initPromise;
}

function normalizePreferences(row = {}) {
  return {
    email_notifications: typeof row.email_notifications === 'boolean'
      ? row.email_notifications
      : DEFAULT_PREFERENCES.email_notifications,
    study_reminders: typeof row.study_reminders === 'boolean'
      ? row.study_reminders
      : DEFAULT_PREFERENCES.study_reminders,
    weekly_digest: typeof row.weekly_digest === 'boolean'
      ? row.weekly_digest
      : DEFAULT_PREFERENCES.weekly_digest,
    progress_alerts: typeof row.progress_alerts === 'boolean'
      ? row.progress_alerts
      : DEFAULT_PREFERENCES.progress_alerts,
  };
}

function getHighestMilestone(count, milestones) {
  let highest = null;

  for (const milestone of milestones) {
    if (count >= milestone) {
      highest = milestone;
    }
  }

  return highest;
}

function getWeekParts(date = new Date()) {
  const current = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = current.getUTCDay() || 7;

  current.setUTCDate(current.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((current - yearStart) / 86400000) + 1) / 7);

  return {
    year: current.getUTCFullYear(),
    week,
  };
}

async function getPreferencesForUser(userId) {
  await ensureNotificationTables();

  const { rows } = await db.query(
    `SELECT email_notifications, study_reminders, weekly_digest, progress_alerts
     FROM notification_preferences
     WHERE user_id = $1`,
    [userId]
  );

  return normalizePreferences(rows[0]);
}

function buildSessionNotifications(rows) {
  const now = new Date();

  return rows.map((row) => {
    const eventAt = new Date(row.event_at);
    const diffMinutes = Math.round((eventAt.getTime() - now.getTime()) / 60000);

    let title = 'Upcoming study session';
    if (diffMinutes <= 30 && diffMinutes >= -15) {
      title = 'Study session starts soon';
    } else if (diffMinutes < -15) {
      title = 'Missed study session';
    } else if (diffMinutes <= 24 * 60) {
      title = 'Study session coming up';
    }

    const scheduleText = row.start_time
      ? `${row.date} at ${row.start_time.slice(0, 5)}`
      : row.date;

    return {
      id: `session:${row.id}`,
      type: 'session',
      title,
      body: `${row.title || 'Untitled session'} is scheduled for ${scheduleText}.`,
      created_at: row.event_at,
      event_at: row.event_at,
      priority_at: row.event_at,
    };
  });
}

function buildMilestoneNotifications(summaryRow) {
  const notifications = [];

  const sessionMilestone = getHighestMilestone(Number(summaryRow.completed_sessions || 0), SESSION_MILESTONES);
  if (sessionMilestone) {
    notifications.push({
      id: `milestone:sessions:${sessionMilestone}`,
      type: 'milestone',
      title: 'Study milestone reached',
      body: `You have completed ${sessionMilestone} study session${sessionMilestone === 1 ? '' : 's'}. Keep the streak going.`,
      created_at: summaryRow.last_completed_session_at || new Date().toISOString(),
      event_at: summaryRow.last_completed_session_at || null,
      priority_at: summaryRow.last_completed_session_at || new Date().toISOString(),
    });
  }

  const testMilestone = getHighestMilestone(Number(summaryRow.total_tests || 0), TEST_MILESTONES);
  if (testMilestone) {
    notifications.push({
      id: `milestone:tests:${testMilestone}`,
      type: 'milestone',
      title: 'Assessment milestone reached',
      body: `You have completed ${testMilestone} test${testMilestone === 1 ? '' : 's'} so far.`,
      created_at: summaryRow.last_test_at || new Date().toISOString(),
      event_at: summaryRow.last_test_at || null,
      priority_at: summaryRow.last_test_at || new Date().toISOString(),
    });
  }

  return notifications;
}

function buildDigestNotification(weeklyRow) {
  const studyMinutes = Number(weeklyRow.study_minutes || 0);
  const testsTaken = Number(weeklyRow.tests_taken || 0);
  const avgScore = Number(weeklyRow.avg_score || 0);
  const upcomingSessions = Number(weeklyRow.upcoming_sessions || 0);

  if (!studyMinutes && !testsTaken && !upcomingSessions) {
    return null;
  }

  const { year, week } = getWeekParts(new Date());

  return {
    id: `digest:${year}-W${String(week).padStart(2, '0')}`,
    type: 'digest',
    title: 'Weekly digest ready',
    body: `This week: ${studyMinutes} study min, ${testsTaken} test${testsTaken === 1 ? '' : 's'}, average score ${avgScore.toFixed(0)}%, and ${upcomingSessions} upcoming session${upcomingSessions === 1 ? '' : 's'}.`,
    created_at: new Date().toISOString(),
    event_at: null,
    priority_at: new Date().toISOString(),
  };
}

async function getGeneratedNotifications(userId) {
  const preferences = await getPreferencesForUser(userId);
  const notifications = [];

  if (preferences.study_reminders) {
    const { rows: sessionRows } = await db.query(
      `
        SELECT
          id,
          title,
          description,
          to_char(date, 'YYYY-MM-DD') AS date,
          to_char(start_time, 'HH24:MI:SS') AS start_time,
          (date::timestamp + COALESCE(start_time, time '00:00')) AS event_at
        FROM study_sessions
        WHERE user_id = $1
          AND completed = false
          AND date IS NOT NULL
          AND (date::timestamp + COALESCE(start_time, time '00:00')) >= NOW() - interval '2 hours'
          AND (date::timestamp + COALESCE(start_time, time '00:00')) <= NOW() + interval '7 days'
        ORDER BY event_at ASC
        LIMIT 6
      `,
      [userId]
    );

    notifications.push(...buildSessionNotifications(sessionRows));
  }

  if (preferences.progress_alerts) {
    const { rows: progressRows } = await db.query(
      `
        SELECT
          (SELECT COUNT(*)::int FROM study_sessions WHERE user_id = $1 AND completed = true) AS completed_sessions,
          (SELECT MAX((date::timestamp + COALESCE(start_time, time '00:00'))) FROM study_sessions WHERE user_id = $1 AND completed = true) AS last_completed_session_at,
          (SELECT COUNT(*)::int FROM assessments WHERE user_id = $1) AS total_tests,
          (SELECT MAX(created_at) FROM assessments WHERE user_id = $1) AS last_test_at
      `,
      [userId]
    );

    notifications.push(...buildMilestoneNotifications(progressRows[0] || {}));
  }

  if (preferences.weekly_digest) {
    const { rows: weeklyRows } = await db.query(
      `
        SELECT
          COALESCE((
            SELECT SUM(duration_minutes)::int
            FROM study_sessions
            WHERE user_id = $1
              AND date >= date_trunc('week', CURRENT_DATE)::date
              AND date < (date_trunc('week', CURRENT_DATE) + interval '7 days')::date
          ), 0) AS study_minutes,
          COALESCE((
            SELECT COUNT(*)::int
            FROM assessments
            WHERE user_id = $1
              AND created_at >= date_trunc('week', CURRENT_DATE)
              AND created_at < date_trunc('week', CURRENT_DATE) + interval '7 days'
          ), 0) AS tests_taken,
          COALESCE((
            SELECT AVG(percentage)::numeric(5,2)
            FROM assessments
            WHERE user_id = $1
              AND created_at >= date_trunc('week', CURRENT_DATE)
              AND created_at < date_trunc('week', CURRENT_DATE) + interval '7 days'
          ), 0) AS avg_score,
          COALESCE((
            SELECT COUNT(*)::int
            FROM study_sessions
            WHERE user_id = $1
              AND completed = false
              AND date >= CURRENT_DATE
              AND date < CURRENT_DATE + 7
          ), 0) AS upcoming_sessions
      `,
      [userId]
    );

    const digestNotification = buildDigestNotification(weeklyRows[0] || {});
    if (digestNotification) {
      notifications.push(digestNotification);
    }
  }

  if (!notifications.length) {
    return [];
  }

  const ids = notifications.map((notification) => notification.id);
  const { rows: readRows } = await db.query(
    `SELECT notification_id
     FROM notification_reads
     WHERE user_id = $1
       AND notification_id = ANY($2::text[])`,
    [userId, ids]
  );

  const readIds = new Set(readRows.map((row) => row.notification_id));

  return notifications
    .map((notification) => ({
      ...notification,
      read: readIds.has(notification.id),
    }))
    .sort((a, b) => {
      if (a.read !== b.read) {
        return a.read ? 1 : -1;
      }

      return new Date(b.priority_at).getTime() - new Date(a.priority_at).getTime();
    });
}

router.get('/preferences', verifyToken, async (req, res) => {
  try {
    const preferences = await getPreferencesForUser(req.user.id);
    res.json(preferences);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/preferences', verifyToken, async (req, res) => {
  try {
    await ensureNotificationTables();

    const preferences = normalizePreferences(req.body);
    const { rows } = await db.query(
      `INSERT INTO notification_preferences (
         user_id, email_notifications, study_reminders, weekly_digest, progress_alerts, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         email_notifications = EXCLUDED.email_notifications,
         study_reminders = EXCLUDED.study_reminders,
         weekly_digest = EXCLUDED.weekly_digest,
         progress_alerts = EXCLUDED.progress_alerts,
         updated_at = CURRENT_TIMESTAMP
       RETURNING email_notifications, study_reminders, weekly_digest, progress_alerts`,
      [
        req.user.id,
        preferences.email_notifications,
        preferences.study_reminders,
        preferences.weekly_digest,
        preferences.progress_alerts,
      ]
    );

    res.json(normalizePreferences(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', verifyToken, async (req, res) => {
  try {
    await ensureNotificationTables();

    const notifications = await getGeneratedNotifications(req.user.id);
    res.json({
      notifications,
      unread_count: notifications.filter((notification) => !notification.read).length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/read', verifyToken, async (req, res) => {
  try {
    await ensureNotificationTables();

    const ids = Array.isArray(req.body.notification_ids)
      ? req.body.notification_ids
          .map((value) => String(value || '').trim())
          .filter(Boolean)
      : [];

    if (!ids.length) {
      return res.status(400).json({ error: 'notification_ids are required' });
    }

    const values = ids.map((id, index) => `($1, $${index + 2}, CURRENT_TIMESTAMP)`).join(', ');
    await db.query(
      `INSERT INTO notification_reads (user_id, notification_id, read_at)
       VALUES ${values}
       ON CONFLICT (user_id, notification_id) DO UPDATE SET
         read_at = EXCLUDED.read_at`,
      [req.user.id, ...ids]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
