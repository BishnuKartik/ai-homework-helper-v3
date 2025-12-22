import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));  // Serves index.html from root

const keys = {
  mistral: process.env.MISTRAL_KEY,
  groq: process.env.GROQ_KEY,
  gemini: process.env.GEMINI_KEY,
  deepseek: process.env.DEEPSEEK_KEY
};

const endpoints = {
  mistral: 'https://api.mistral.ai/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
};

app.post('/api/ai', async (req, res) => {
  const { provider, payload } = req.body;
  if (!keys[provider]) return res.status(400).json({ error: "Invalid provider" });

  try {
    const url = endpoints[provider] + (provider === 'gemini' ? `?key=${keys.gemini}` : '');
    const headers = {
      'Content-Type': 'application/json',
      ...(provider !== 'gemini' && { Authorization: `Bearer ${keys[provider]}` })
    };

    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    const data = await response.json();

    let text = '';
    if (provider === 'gemini') {
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
    } else {
      text = data.choices?.[0]?.message?.content || 'No response';
    }

    res.json({ text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'AI provider error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));