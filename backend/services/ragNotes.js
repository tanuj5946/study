const crypto = require('crypto');
const db = require('../config/db');
const { ingestDocument, deleteChunksBySource } = require('./ragIngest');

function hashNoteContent(note) {
  return crypto
    .createHash('sha256')
    .update(`${note.title}\n${note.content}`)
    .digest('hex');
}

function buildChunkTitle(note) {
  return `${note.subject_name} / ${note.module_name} / ${note.title}`;
}

async function getNotesForRag() {
  const { rows } = await db.query(`
    SELECT
      n.id,
      n.title,
      n.content,
      n.module_id,
      m.module_name,
      m.subject_id,
      s.name AS subject_name
    FROM notes n
    JOIN modules m ON m.id = n.module_id
    JOIN subjects s ON s.id = m.subject_id
    ORDER BY s.id, m.id, n.id
  `);

  return rows;
}

async function getExistingNoteHashes(user_id) {
  const { rows } = await db.query(
    `
    SELECT
      source_id,
      metadata ->> 'content_hash' AS content_hash
    FROM rag_chunks
    WHERE user_id = $1
      AND source_type = 'note'
    `,
    [user_id]
  );

  return new Map(rows.map((row) => [row.source_id, row.content_hash]));
}

async function pruneDeletedNoteChunks(user_id, validNoteIds) {
  if (validNoteIds.length === 0) {
    await db.query(
      `
      DELETE FROM rag_chunks
      WHERE user_id = $1
        AND source_type = 'note'
      `,
      [user_id]
    );
    return;
  }

  await db.query(
    `
    DELETE FROM rag_chunks
    WHERE user_id = $1
      AND source_type = 'note'
      AND NOT (source_id = ANY($2::int[]))
    `,
    [user_id, validNoteIds]
  );
}

async function syncNoteForUser(user_id, note, existingHashes) {
  const contentHash = hashNoteContent(note);
  const previousHash = existingHashes.get(note.id);

  if (previousHash === contentHash) {
    return false;
  }

  await deleteChunksBySource({
    user_id,
    source_type: 'note',
    source_id: note.id,
  });

  await ingestDocument({
    user_id,
    source_type: 'note',
    source_id: note.id,
    title: buildChunkTitle(note),
    text: note.content,
    metadata: {
      note_id: note.id,
      note_title: note.title,
      module_id: note.module_id,
      module_name: note.module_name,
      subject_id: note.subject_id,
      subject_name: note.subject_name,
      content_hash: contentHash,
    },
  });

  return true;
}

async function ensureNotesSyncedForUser(user_id) {
  const notes = await getNotesForRag();
  const existingHashes = await getExistingNoteHashes(user_id);
  const validNoteIds = notes.map((note) => note.id);

  await pruneDeletedNoteChunks(user_id, validNoteIds);

  let syncedCount = 0;

  for (const note of notes) {
    const synced = await syncNoteForUser(user_id, note, existingHashes);
    if (synced) {
      syncedCount += 1;
    }
  }

  return {
    totalNotes: notes.length,
    syncedNotes: syncedCount,
  };
}

async function syncNotesForAllUsers() {
  const { rows } = await db.query('SELECT id FROM users ORDER BY id');
  const results = [];

  for (const row of rows) {
    const result = await ensureNotesSyncedForUser(row.id);
    results.push({ user_id: row.id, ...result });
  }

  return results;
}

module.exports = {
  ensureNotesSyncedForUser,
  syncNotesForAllUsers,
};
