const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { giveStarterItems } = require('../inventory');

// Registrazione
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password obbligatori!' });
    }

    const existing = await db('users').where({ username }).first();
    if (existing) {
      return res.status(400).json({ error: 'Username già esistente!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [userId] = await db('users').insert({ username, password: hashedPassword });

    await db('players').insert({ user_id: userId });

    await giveStarterItems(userId);

    res.json({ message: `Benvenuto nel multiverso, ${username}! 🛸` });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await db('users').where({ username }).first();

    if (!user) {
      return res.status(400).json({ error: 'Utente non trovato!' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Password errata!' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'portalmmo_secret',
      { expiresIn: '7d' }
    );

    res.json({ 
      message: `Bentornato, ${username}! 🛸`,
      token,
      userId: user.id
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

module.exports = router;