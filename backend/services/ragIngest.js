const db = require('../config/db');
const { embedText } = require('../lib/ollamaClient');
const { chunkText } = require('../utils/chunkText');

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
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [user_id, source_type, source_id, title, chunk, JSON.stringify(embedding), metadata]
    );
  }

  return { inserted: chunks.length };
}

module.exports = { ingestDocument };