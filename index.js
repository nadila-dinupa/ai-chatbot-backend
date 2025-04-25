const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
require('dotenv').config();
const OpenAI = require('openai');

// 🔐 Load your JWT secret from .env
const SECRET_KEY = process.env.JWT_SECRET || 'fallback_key';

// 🧠 Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// 🗂️ In-memory user database (not permanent)
const users = [];

// 🔐 JWT middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalid' });
    req.user = user;
    next();
  });
}

// ✅ Health check route
app.get('/', (req, res) => {
  res.send('✅ Backend is working!');
});

// ✅ Signup
app.post('/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const newUser = { id: Date.now(), name, email, password };
  users.push(newUser);

  const token = jwt.sign({ id: newUser.id, email }, SECRET_KEY, { expiresIn: '1h' });
  res.status(201).json({ token });
});

// ✅ Login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, email }, SECRET_KEY, { expiresIn: '1h' });
  res.status(200).json({ token });
});

// ✅ Chat (OpenAI GPT response)
app.post('/chat', authenticateToken, async (req, res) => {
  const { prompt } = req.body;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ]
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error('OpenAI Error:', error.message);
    res.status(500).json({ error: 'AI request failed' });
  }
});

// 🚀 Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
