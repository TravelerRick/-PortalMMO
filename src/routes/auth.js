const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { giveStarterItems } = require('../inventory');

// Registrazione
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password obbligatori!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertUser = db.prepare(
      'INSERT INTO users (username, password) VALUES (?, ?)'
    );
    const result = insertUser.run(username, hashedPassword);

    const insertPlayer = db.prepare(
      'INSERT INTO players (user_id) VALUES (?)'
    );
    insertPlayer.run(result.lastInsertRowid);

    // Dai oggetti iniziali
    giveStarterItems(result.lastInsertRowid);

    res.json({ message: `Benvenuto nel multiverso, ${username}! 🛸` });

  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Username già esistente!' });
    }
    res.status(500).json({ error: 'Errore del server' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = db.prepare(
      'SELECT * FROM users WHERE username = ?'
    ).get(username);

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
    res.status(500).json({ error: 'Errore del server' });
  }
});

module.exports = router;