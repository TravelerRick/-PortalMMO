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
  const nephew = await db('player_nephews').where({ id: nephewDbId }).first();
  if (!nephew) return { error: 'Nipote non trovato!' };

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

  await db('player_nephews').where({ id: nephewDbId }).update({
    experience: newExp,
    level: newLevel,
    hp: newStats.hp,
    atk: newStats.atk,
    def: newStats.def,
    spd: newStats.spd
  });

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
  const player = await db('players').where({ user_id: userId }).first();
  if (!player) return { error: 'Giocatore non trovato!' };

  let newExp = player.experience + amount;
  let newLevel = player.level;
  let leveledUp = false;

  while (newExp >= expForLevel(newLevel)) {
    newExp -= expForLevel(newLevel);
    newLevel++;
    leveledUp = true;
  }

  await db('players').where({ user_id: userId }).update({
    experience: newExp,
    level: newLevel
  });

  return { success: true, leveledUp, newLevel, newExp, expNeeded: expForLevel(newLevel) };
}

async function getPlayerProfile(userId) {
  const player = await db('players').where({ user_id: userId }).first();
  if (!player) return null;

  return {
    ...player,
    expNeeded: expForLevel(player.level)
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