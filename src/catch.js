// Sistema Cattura Nipoti - PortalMMO

const db = require('./database');
const { baseNephews } = require('./battle');

// Crea tabella nipoti nel database
db.exec(`
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

// Genera un Nipote selvatico casuale
function generateWildNephew() {
  const random = Math.floor(Math.random() * baseNephews.length);
  const base = baseNephews[random];
  
  // Variazione casuale nelle statistiche
  return {
    ...base,
    hp: base.hp + Math.floor(Math.random() * 10),
    atk: base.atk + Math.floor(Math.random() * 5),
    def: base.def + Math.floor(Math.random() * 5),
    spd: base.spd + Math.floor(Math.random() * 5),
    isWild: true
  };
}

// Calcola probabilità di cattura
function calculateCatchRate(nephewHp, currentHp) {
  const hpPercent = currentHp / nephewHp;
  if (hpPercent <= 0.1) return 0.90; // 90% sotto 10% HP
  if (hpPercent <= 0.25) return 0.70; // 70% sotto 25% HP
  if (hpPercent <= 0.50) return 0.45; // 45% sotto 50% HP
  return 0.20; // 20% HP pieno
}

// Tenta di catturare un Nipote
function attemptCatch(userId, wildNephew) {
  const catchRate = calculateCatchRate(wildNephew.hp, wildNephew.currentHp || wildNephew.hp);
  const success = Math.random() < catchRate;

  if (success) {
    // Salva nel database
    const insert = db.prepare(`
      INSERT INTO player_nephews (user_id, nephew_id, hp, atk, def, spd)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insert.run(userId, wildNephew.id, wildNephew.hp, wildNephew.atk, wildNephew.def, wildNephew.spd);
    
    return { success: true, message: `Hai catturato ${wildNephew.name}! 🎉` };
  }

  return { success: false, message: `${wildNephew.name} è scappato! 😤` };
}

// Ottieni tutti i Nipoti di un giocatore
function getPlayerNephews(userId) {
  return db.prepare(`
    SELECT * FROM player_nephews WHERE user_id = ?
  `).all(userId);
}

function setupCatch(io) {
  io.on('connection', (socket) => {

    // Genera incontro selvatico
    socket.on('findWild', () => {
      const wild = generateWildNephew();
      socket.emit('wildEncounter', wild);
    });

    // Tenta cattura
    socket.on('catchNephew', (data) => {
      const { userId, wildNephew } = data;
      const result = attemptCatch(userId, wildNephew);
      socket.emit('catchResult', result);
    });

    // Ottieni lista Nipoti
    socket.on('getMyNephews', (data) => {
      const nephews = getPlayerNephews(data.userId);
      socket.emit('myNephews', nephews);
    });
  });
}

module.exports = { setupCatch, generateWildNephew, attemptCatch, getPlayerNephews };