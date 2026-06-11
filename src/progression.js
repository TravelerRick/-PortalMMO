// Sistema Progressione - PortalMMO
const { db } = require('./database');

function expForLevel(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

function calculateStats(baseStats, level) {
  const multiplier = 1 + (level - 1) * 0.1;
  return {
    hp: Math.floor(baseStats.hp * multiplier),
    atk: Math.floor(baseStats.atk * multiplier),
    def: Math.floor(baseStats.def * multiplier),
    spd: Math.floor(baseStats.spd * multiplier)
  };
}

async function addExperience(nephewDbId, amount) {
  const rows = await db.query(
    `SELECT * FROM player_nephews WHERE id = ?`,
    [nephewDbId]
  );
  if (rows.length === 0) return { error: 'Nipote non trovato!' };

  const nephew = rows[0];
  let newExp = nephew.experience + amount;
  let newLevel = nephew.level;
  let leveledUp = false;

  while (newExp >= expForLevel(newLevel)) {
    newExp -= expForLevel(newLevel);
    newLevel++;
    leveledUp = true;
  }

  const newStats = calculateStats(
    { hp: nephew.hp, atk: nephew.atk, def: nephew.def, spd: nephew.spd },
    newLevel
  );

  await db.query(
    `UPDATE player_nephews SET experience = ?, level = ?, hp = ?, atk = ?, def = ?, spd = ? WHERE id = ?`,
    [newExp, newLevel, newStats.hp, newStats.atk, newStats.def, newStats.spd, nephewDbId]
  );

  return {
    success: true,
    leveledUp,
    newLevel,
    newExp,
    expNeeded: expForLevel(newLevel),
    message: `+${amount} EXP!${leveledUp ? ` Livello ${newLevel}! 🎉` : ''}`
  };
}

async function addPlayerExperience(userId, amount) {
  const rows = await db.query(
    `SELECT * FROM players WHERE user_id = ?`,
    [userId]
  );
  if (rows.length === 0) return { error: 'Giocatore non trovato!' };

  const player = rows[0];
  let newExp = player.experience + amount;
  let newLevel = player.level;
  let leveledUp = false;

  while (newExp >= expForLevel(newLevel)) {
    newExp -= expForLevel(newLevel);
    newLevel++;
    leveledUp = true;
  }

  await db.query(
    `UPDATE players SET experience = ?, level = ? WHERE user_id = ?`,
    [newExp, newLevel, userId]
  );

  return { success: true, leveledUp, newLevel, newExp, expNeeded: expForLevel(newLevel) };
}

async function getPlayerProfile(userId) {
  const rows = await db.query(
    `SELECT * FROM players WHERE user_id = ?`,
    [userId]
  );
  if (rows.length === 0) return null;

  return {
    ...rows[0],
    expNeeded: expForLevel(rows[0].level)
  };
}

function setupProgression(io) {
  io.on('connection', (socket) => {
    socket.on('getProfile', async (data) => {
      const profile = await getPlayerProfile(data.userId);
      socket.emit('profileData', profile);
    });

    socket.on('addNephewExp', async (data) => {
      const result = await addExperience(data.nephewDbId, data.amount);
      socket.emit('nephewExpResult', result);
    });

    socket.on('addPlayerExp', async (data) => {
      const result = await addPlayerExperience(data.userId, data.amount);
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