const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../portalmmo.db'));

// Funzione helper per eseguire query sincrone
db.exec = (sql) => {
  db.serialize(() => {
    db.run(sql);
  });
};

db.prepare = (sql) => {
  return {
    run: (...params) => {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastInsertRowid: this.lastID });
        });
      });
    },
    get: (...params) => {
      return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    },
    all: (...params) => {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }
  };
};

// Crea tabelle
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      level INTEGER DEFAULT 1,
      experience INTEGER DEFAULT 0,
      portal_fragments INTEGER DEFAULT 100,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
});

console.log('Database PortalMMO pronto! 🛸');

module.exports = db;