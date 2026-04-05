const OPENROUTER_BASE_URL = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const DEFAULT_CHAT_MODEL = process.env.OPENROUTER_CHAT_MODEL || 'openai/gpt-4o-mini';
const DEFAULT_EMBED_MODEL = process.env.OPENROUTER_EMBED_MODEL || 'openai/text-embedding-3-small';
const REQUEST_TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS || 120000);

function buildHeaders() {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    ...(process.env.OPENROUTER_HTTP_REFERER
      ? { 'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER }
      : {}),
    ...(process.env.OPENROUTER_APP_TITLE
      ? { 'X-Title': process.env.OPENROUTER_APP_TITLE }
      : {}),
  };
}

async function postToOpenRouter(path, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}${path}`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const rawText = await response.text();
    let data;

    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      throw new Error(`Invalid OpenRouter response from ${path}: ${rawText.slice(0, 300)}`);
    }

    if (!response.ok) {
      const message =
        data?.error?.message ||
        data?.error ||
        data?.message ||
        `OpenRouter request failed with status ${response.status}`;
      throw new Error(message);
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`OpenRouter request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateAnswer(messages, options = {}) {
  const modelOptions = options.modelOptions || {};
  const response = await postToOpenRouter('/chat/completions', {
    model: options.model || DEFAULT_CHAT_MODEL,
    messages,
    temperature: options.temperature ?? modelOptions.temperature ?? 0.2,
    top_p: options.top_p ?? modelOptions.top_p ?? 0.9,
    max_tokens: options.max_tokens ?? modelOptions.max_tokens ?? 400,
  });

  return response?.choices?.[0]?.message?.content || '';
}

async function embedText(text, options = {}) {
  const response = await postToOpenRouter('/embeddings', {
    model: options.model || DEFAULT_EMBED_MODEL,
    input: text,
  });

  const embedding = response?.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error('OpenRouter embed response missing embedding');
  }

  return embedding;
}

module.exports = {
  generateAnswer,
  embedText,
  postToOpenRouter,
};
