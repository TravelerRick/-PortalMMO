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

    const existing = await db.query(
      `SELECT id FROM users WHERE username = ?`,
      [username]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username già esistente!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users (username, password) VALUES (?, ?)`,
      [username, hashedPassword]
    );

    const user = await db.query(
      `SELECT id FROM users WHERE username = ?`,
      [username]
    );
    const userId = user[0].id;

    await db.query(
      `INSERT INTO players (user_id) VALUES (?)`,
      [userId]
    );

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

    const users = await db.query(
      `SELECT * FROM users WHERE username = ?`,
      [username]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'Utente non trovato!' });
    }

    const user = users[0];
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