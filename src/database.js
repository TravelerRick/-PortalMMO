const createDatabase = require('@databases/sqlite');
const path = require('path');

const db = createDatabase(path.join(__dirname, '../portalmmo.db'));

async function initDatabase() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      level INTEGER DEFAULT 1,
      experience INTEGER DEFAULT 0,
      portal_fragments INTEGER DEFAULT 100,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS player_nephews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      nephew_id INTEGER NOT NULL,
      nickname TEXT,
      level INTEGER DEFAULT 1,
      experience INTEGER DEFAULT 0,
      hp INTEGER NOT NULL,
      atk INTEGER NOT NULL,
      def INTEGER NOT NULL,
      spd INTEGER NOT NULL,
      caught_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      item_type TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      sender_nephew_id INTEGER NOT NULL,
      receiver_nephew_id INTEGER,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    )
  `);

  console.log('Database PortalMMO pronto! 🛸');
}

module.exports = { db, initDatabase };