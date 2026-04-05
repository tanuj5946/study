const db = require('../config/db');
const { embedText } = require('../lib/aiClient');

async function searchChunks({ user_id, query, limit = 5, threshold = 0.3 }) {
  const embedding = await embedText(query);

  // ✅ Format as pgvector literal
  const vectorLiteral = `[${embedding.join(',')}]`;

  const { rows } = await db.query(
    `SELECT
       id,
       title,
       chunk_text,
       metadata,
       1 - (embedding <=> $1::vector) AS similarity
     FROM rag_chunks
     WHERE user_id = $2
       AND 1 - (embedding <=> $1::vector) > $3   -- ✅ filter low-quality matches
     ORDER BY embedding <=> $1::vector
     LIMIT $4`,
    [vectorLiteral, user_id, threshold, limit]
  );

  return rows;
}

module.exports = { searchChunks };
