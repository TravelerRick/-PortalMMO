const Database = require('better-sqlite3');
const path = require('path');

// Crea o apre il database
const db = new Database(path.join(__dirname, '../portalmmo.db'));

// Crea tabella utenti
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Crea tabella giocatori
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    portal_fragments INTEGER DEFAULT 100,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

console.log('Database PortalMMO pronto! 🛸');

module.exports = db;