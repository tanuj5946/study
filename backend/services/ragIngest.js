const db = require('../config/db');
const { embedText } = require('../lib/ollamaClient');
const { chunkText } = require('../utils/chunkText');

async function deleteChunksBySource({
  user_id,
  source_type,
  source_id,
}) {
  const filters = ['source_type = $1', 'source_id = $2'];
  const values = [source_type, source_id];

  if (user_id == null) {
    filters.push('user_id IS NULL');
  } else {
    filters.push(`user_id = $${values.length + 1}`);
    values.push(user_id);
  }

  await db.query(
    `DELETE FROM rag_chunks
     WHERE ${filters.join(' AND ')}`,
    values
  );
}

async function ingestDocument({
  user_id,
  source_type,
  source_id,
  title,
  text,
  metadata = {},
}) {
  const chunks = chunkText(text);

  for (const chunk of chunks) {
    const embedding = await embedText(chunk);
    const vectorLiteral = `[${embedding.join(',')}]`;

    await db.query(
      `
      INSERT INTO rag_chunks
      (user_id, source_type, source_id, title, chunk_text, embedding, metadata)
      VALUES ($1, $2, $3, $4, $5, $6::vector, $7::jsonb)
      `,
      [
        user_id ?? null,
        source_type,
        source_id,
        title,
        chunk,
        vectorLiteral,
        JSON.stringify(metadata),
      ]
    );
  }

  return { inserted: chunks.length };
}

module.exports = { ingestDocument, deleteChunksBySource };
