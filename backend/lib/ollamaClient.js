const { Ollama } = require('ollama');

const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
});

async function generateAnswer(messages) {
  const res = await ollama.chat({
    model: process.env.OLLAMA_MODEL || 'llama3:8b-instruct-q5_0',
    messages,
    options: {
      temperature: 0.2,
      top_p: 0.9,
      num_predict: 400,
    },
  });

  return res.message.content;
}

async function embedText(text) {
  const res = await ollama.embed({
    model: process.env.OLLAMA_EMBED_MODEL || 'mxbai-embed-large:latest',
    input: text,
  });

  return res.embeddings[0];
}

module.exports = { ollama, generateAnswer, embedText };
