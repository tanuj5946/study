const DEFAULT_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || process.env.OLLAMA_MODEL || 'llama3:latest';
const DEFAULT_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'mxbai-embed-large:latest';
const OLLAMA_HOST = (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 120000);

async function postToOllama(path, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_HOST}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const rawText = await response.text();
    let data;

    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      throw new Error(`Invalid Ollama response from ${path}: ${rawText.slice(0, 300)}`);
    }

    if (!response.ok) {
      throw new Error(data.error || `Ollama request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Ollama request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateAnswer(messages, options = {}) {
  const response = await postToOllama('/api/chat', {
    model: options.model || DEFAULT_CHAT_MODEL,
    messages,
    stream: false,
    keep_alive: options.keepAlive || '10m',
    options: {
      temperature: 0.2,
      top_p: 0.9,
      num_predict: 400,
      ...(options.ollamaOptions || {}),
    },
  });

  return response?.message?.content || '';
}

async function embedText(text, options = {}) {
  const response = await postToOllama('/api/embed', {
    model: options.model || DEFAULT_EMBED_MODEL,
    input: text,
  });

  if (!response.embeddings?.[0]) {
    throw new Error('Ollama embed response missing embeddings');
  }

  return response.embeddings[0];
}

module.exports = {
  generateAnswer,
  embedText,
  postToOllama,
};
