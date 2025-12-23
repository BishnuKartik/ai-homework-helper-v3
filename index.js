import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs'; // Built-in, no install needed
import crypto from 'crypto'; // Built-in

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// AI proxy (unchanged)
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
    const headers = { 'Content-Type': 'application/json' };
    if (provider !== 'gemini') headers.Authorization = `Bearer ${keys[provider]}`;

    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    const data = await response.json();

    const text = provider === 'gemini'
      ? data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response'
      : data.choices?.[0]?.message?.content || 'No response';

    res.json({ text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'AI error' });
  }
});

// Serve static files (for any other files like images if you add them)
app.use(express.static(__dirname));

// Main route: Serve index.html with nonce injected
app.get('/', (req, res) => {
  const nonce = crypto.randomBytes(16).toString('base64'); // Generate nonce

  // Set CSP header with nonce
  res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'nonce-\( {nonce}' 'strict-dynamic' https://cdnjs.cloudflare.com; style-src 'nonce- \){nonce}' https://cdnjs.cloudflare.com; img-src 'self' data: https:; font-src https://cdnjs.cloudflare.com; connect-src 'self' https://www.googleapis.com https://api.mistral.ai https://api.groq.com https://api.deepseek.com https://generativelanguage.googleapis.com;`);

  // Read index.html and inject nonce into <style> and <script>
  fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, html) => {
    if (err) {
      res.status(500).send('Error loading page');
      return;
    }

    // Inject nonce into tags
    html = html.replace(/<script/g, `<script nonce="${nonce}"`);
    html = html.replace(/<style/g, `<style nonce="${nonce}"`);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));