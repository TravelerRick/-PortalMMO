// Sistema Cattura Nipoti - PortalMMO
const { db } = require('./database');
const { baseNephews } = require('./battle');

// Genera un Nipote selvatico casuale
function generateWildNephew() {
  const random = Math.floor(Math.random() * baseNephews.length);
  const base = baseNephews[random];
  
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
  if (hpPercent <= 0.1) return 0.90;
  if (hpPercent <= 0.25) return 0.70;
  if (hpPercent <= 0.50) return 0.45;
  return 0.20;
}

// Tenta cattura
async function attemptCatch(userId, wildNephew) {
  const catchRate = calculateCatchRate(
    wildNephew.hp, 
    wildNephew.currentHp || wildNephew.hp
  );
  const success = Math.random() < catchRate;

  if (success) {
    await db.query(
      `INSERT INTO player_nephews (user_id, nephew_id, hp, atk, def, spd) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, wildNephew.id, wildNephew.hp, wildNephew.atk, wildNephew.def, wildNephew.spd]
    );
    return { success: true, message: `Hai catturato ${wildNephew.name}! 🎉` };
  }

  return { success: false, message: `${wildNephew.name} è scappato! 😤` };
}

// Ottieni Nipoti del giocatore
async function getPlayerNephews(userId) {
  return await db.query(
    `SELECT * FROM player_nephews WHERE user_id = ?`,
    [userId]
  );
}

function setupCatch(io) {
  io.on('connection', (socket) => {
    socket.on('findWild', () => {
      const wild = generateWildNephew();
      socket.emit('wildEncounter', wild);
    });

    socket.on('catchNephew', async (data) => {
      const { userId, wildNephew } = data;
      const result = await attemptCatch(userId, wildNephew);
      socket.emit('catchResult', result);
    });

    socket.on('getMyNephews', async (data) => {
      const nephews = await getPlayerNephews(data.userId);
      socket.emit('myNephews', nephews);
    });
  });
}

module.exports = { setupCatch, generateWildNephew, attemptCatch, getPlayerNephews };