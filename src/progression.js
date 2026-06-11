// Sistema Progressione - PortalMMO

const db = require('./database');

// Esperienza necessaria per ogni livello
function expForLevel(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

// Calcola statistiche in base al livello
function calculateStats(baseStats, level) {
  const multiplier = 1 + (level - 1) * 0.1;
  return {
    hp: Math.floor(baseStats.hp * multiplier),
    atk: Math.floor(baseStats.atk * multiplier),
    def: Math.floor(baseStats.def * multiplier),
    spd: Math.floor(baseStats.spd * multiplier)
  };
}

// Aggiungi esperienza a un Nipote
function addExperience(nephewDbId, amount) {
  const nephew = db.prepare(
    'SELECT * FROM player_nephews WHERE id = ?'
  ).get(nephewDbId);

  if (!nephew) return { error: 'Nipote non trovato!' };

  let newExp = nephew.experience + amount;
  let newLevel = nephew.level;
  let leveledUp = false;
  let message = `+${amount} EXP!`;

  // Controlla se sale di livello
  while (newExp >= expForLevel(newLevel)) {
    newExp -= expForLevel(newLevel);
    newLevel++;
    leveledUp = true;
  }

  // Aggiorna nel database
  const newStats = calculateStats(
    { hp: nephew.hp, atk: nephew.atk, def: nephew.def, spd: nephew.spd },
    newLevel
  );

  db.prepare(`
    UPDATE player_nephews 
    SET experience = ?, level = ?, hp = ?, atk = ?, def = ?, spd = ?
    WHERE id = ?
  `).run(newExp, newLevel, newStats.hp, newStats.atk, newStats.def, newStats.spd, nephewDbId);

  if (leveledUp) {
    message += ` Livello ${newLevel}! 🎉`;
  }

  return {
    success: true,
    leveledUp,
    newLevel,
    newExp,
    expNeeded: expForLevel(newLevel),
    message
  };
}

// Aggiungi esperienza al giocatore
function addPlayerExperience(userId, amount) {
  const player = db.prepare(
    'SELECT * FROM players WHERE user_id = ?'
  ).get(userId);

  if (!player) return { error: 'Giocatore non trovato!' };

  let newExp = player.experience + amount;
  let newLevel = player.level;
  let leveledUp = false;

  while (newExp >= expForLevel(newLevel)) {
    newExp -= expForLevel(newLevel);
    newLevel++;
    leveledUp = true;
  }

  db.prepare(`
    UPDATE players SET experience = ?, level = ? WHERE user_id = ?
  `).run(newExp, newLevel, userId);

  return {
    success: true,
    leveledUp,
    newLevel,
    newExp,
    expNeeded: expForLevel(newLevel)
  };
}

// Ottieni profilo giocatore
function getPlayerProfile(userId) {
  const player = db.prepare(
    'SELECT * FROM players WHERE user_id = ?'
  ).get(userId);

  if (!player) return null;

  return {
    ...player,
    expNeeded: expForLevel(player.level)
  };
}

function setupProgression(io) {
  io.on('connection', (socket) => {

    // Ottieni profilo
    socket.on('getProfile', (data) => {
      const profile = getPlayerProfile(data.userId);
      socket.emit('profileData', profile);
    });

    // Aggiungi exp al Nipote
    socket.on('addNephewExp', (data) => {
      const result = addExperience(data.nephewDbId, data.amount);
      socket.emit('nephewExpResult', result);
    });

    // Aggiungi exp al giocatore
    socket.on('addPlayerExp', (data) => {
      const result = addPlayerExperience(data.userId, data.amount);
      socket.emit('playerExpResult', result);
    });
  });
}

module.exports = { 
  setupProgression, 
  addExperience, 
  addPlayerExperience, 
  getPlayerProfile,
  expForLevel,
  calculateStats
};