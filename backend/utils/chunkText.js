function chunkText(text, chunkSize = 800, overlap = 120) {
  // Normalize whitespace
  const clean = text.replace(/\s+/g, ' ').trim();

  // Split on sentence boundaries first
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];

  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > chunkSize && current.length > 0) {
      chunks.push(current.trim());
      // Keep overlap: take last `overlap` chars of current into next chunk
      current = current.slice(-overlap) + sentence;
    } else {
      current += sentence;
    }
  }

  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

module.exports = { chunkText };