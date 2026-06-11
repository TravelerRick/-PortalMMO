// Sistema PvP - PortalMMO
const { addPlayerExperience } = require('./progression');
const { addItem } = require('./inventory');

const pvpQueue = new Map();
const pvpBattles = new Map();

function createPvpBattle(player1, player2) {
  const battleId = `pvp_${Date.now()}`;
  
  const battle = {
    id: battleId,
    p1: { ...player1, currentHp: player1.nephew.hp },
    p2: { ...player2, currentHp: player2.nephew.hp },
    turn: player1.socketId,
    status: 'active',
    log: []
  };

  pvpBattles.set(battleId, battle);
  return battle;
}

async function executePvpMove(battleId, socketId, move) {
  const battle = pvpBattles.get(battleId);

  if (!battle) return { error: 'Battaglia non trovata!' };
  if (battle.status !== 'active') return { error: 'Battaglia terminata!' };
  if (battle.turn !== socketId) return { error: 'Non è il tuo turno!' };

  const isP1 = battle.p1.socketId === socketId;
  const attacker = isP1 ? battle.p1 : battle.p2;
  const defender = isP1 ? battle.p2 : battle.p1;

  const base = (attacker.nephew.atk / defender.nephew.def) * move.power;
  const random = 0.85 + Math.random() * 0.15;
  const damage = Math.max(1, Math.floor(base * random));

  defender.currentHp = Math.max(0, defender.currentHp - damage);

  const logEntry = `${attacker.username} usa ${move.name} e fa ${damage} danni!`;
  battle.log.push(logEntry);

  if (defender.currentHp <= 0) {
    battle.status = 'finished';
    battle.winner = socketId;
    battle.loser = defender.socketId;

    await addPlayerExperience(attacker.userId, 50);
    await addItem(attacker.userId, 'Pozione', 1);
    await addPlayerExperience(defender.userId, 10);

    battle.log.push(`${attacker.username} ha vinto il PvP! 🏆 +50 EXP`);

    return {
      battleId,
      log: logEntry,
      damage,
      defenderHp: 0,
      finished: true,
      winner: attacker.username,
      loser: defender.username
    };
  }

  battle.turn = defender.socketId;

  return {
    battleId,
    log: logEntry,
    damage,
    defenderHp: defender.currentHp,
    nextTurn: defender.username,
    finished: false
  };
}

function setupPvp(io) {
  io.on('connection', (socket) => {
    socket.on('joinPvpQueue', (data) => {
      pvpQueue.set(socket.id, {
        socketId: socket.id,
        username: data.username,
        userId: data.userId,
        nephew: data.nephew
      });

      socket.emit('pvpQueueJoined', { 
        message: 'Sei in coda PvP! Cerco avversario... 🔍',
        queueSize: pvpQueue.size
      });

      if (pvpQueue.size >= 2) {
        const players = Array.from(pvpQueue.values());
        const p1 = players[0];
        const p2 = players[1];

        pvpQueue.delete(p1.socketId);
        pvpQueue.delete(p2.socketId);

        const battle = createPvpBattle(p1, p2);

        io.to(p1.socketId).emit('pvpStart', { battle, opponent: p2.username });
        io.to(p2.socketId).emit('pvpStart', { battle, opponent: p1.username });
      }
    });

    socket.on('leavePvpQueue', () => {
      pvpQueue.delete(socket.id);
      socket.emit('pvpQueueLeft', { message: 'Sei uscito dalla coda PvP!' });
    });

    socket.on('pvpMove', async (data) => {
      const { battleId, move } = data;
      const result = await executePvpMove(battleId, socket.id, move);

      if (result.error) {
        socket.emit('pvpError', result);
        return;
      }

      const battle = pvpBattles.get(battleId);
      if (battle) {
        io.to(battle.p1.socketId).emit('pvpUpdate', result);
        io.to(battle.p2.socketId).emit('pvpUpdate', result);
      }
    });

    socket.on('disconnect', () => {
      pvpQueue.delete(socket.id);
    });
  });
}

module.exports = { setupPvp, pvpBattles, pvpQueue };