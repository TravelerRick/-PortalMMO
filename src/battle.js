// Sistema Battaglie a Turni - PortalMMO

const activeBattles = new Map();

// Calcola danno
function calculateDamage(attacker, defender, move) {
  const base = (attacker.atk / defender.def) * move.power;
  const random = 0.85 + Math.random() * 0.15;
  return Math.max(1, Math.floor(base * random));
}

// Crea una nuova battaglia
function createBattle(player1, player2) {
  const battleId = `battle_${Date.now()}`;
  
  const battle = {
    id: battleId,
    players: {
      p1: { ...player1, currentHp: player1.nephew.hp },
      p2: { ...player2, currentHp: player2.nephew.hp }
    },
    turn: player1.id, // Chi inizia
    status: 'active',
    log: []
  };

  activeBattles.set(battleId, battle);
  return battle;
}

// Esegui una mossa
function executeMove(battleId, playerId, move) {
  const battle = activeBattles.get(battleId);
  
  if (!battle) return { error: 'Battaglia non trovata!' };
  if (battle.status !== 'active') return { error: 'Battaglia terminata!' };
  if (battle.turn !== playerId) return { error: 'Non è il tuo turno!' };

  // Identifica attaccante e difensore
  const isP1 = battle.players.p1.id === playerId;
  const attacker = isP1 ? battle.players.p1 : battle.players.p2;
  const defender = isP1 ? battle.players.p2 : battle.players.p1;

  // Calcola danno
  const damage = calculateDamage(attacker.nephew, defender.nephew, move);
  defender.currentHp = Math.max(0, defender.currentHp - damage);

  // Aggiungi al log
  const logEntry = `${attacker.username} usa ${move.name} e fa ${damage} danni!`;
  battle.log.push(logEntry);

  // Controlla se qualcuno ha perso
  if (defender.currentHp <= 0) {
    battle.status = 'finished';
    battle.winner = playerId;
    battle.log.push(`${attacker.username} ha vinto la battaglia! 🏆`);
    
    return {
      battleId,
      log: logEntry,
      damage,
      defenderHp: 0,
      finished: true,
      winner: attacker.username
    };
  }

  // Cambia turno
  battle.turn = defender.id;

  return {
    battleId,
    log: logEntry,
    damage,
    defenderHp: defender.currentHp,
    nextTurn: defender.username,
    finished: false
  };
}

// Nipoti base di esempio
const baseNephews = [
  { id: 1, name: 'Normal M.', hp: 50, atk: 10, def: 8, spd: 8,
    moves: [
      { name: 'Pugno Base', power: 10 },
      { name: 'Calcio', power: 15 },
    ]
  },
  { id: 2, name: 'Wizard M.', hp: 40, atk: 15, def: 6, spd: 10,
    moves: [
      { name: 'Magia', power: 18 },
      { name: 'Scudo Magico', power: 5 },
    ]
  },
  { id: 3, name: 'Cronenberg M.', hp: 70, atk: 12, def: 12, spd: 5,
    moves: [
      { name: 'Mutazione', power: 14 },
      { name: 'Artigli', power: 16 },
    ]
  }
];

function setupBattles(io) {
  io.on('connection', (socket) => {

    // Sfida un altro giocatore
    socket.on('challengePlayer', (data) => {
      const { targetId, nephewId } = data;
      const nephew = baseNephews.find(n => n.id === nephewId) || baseNephews[0];
      
      io.to(targetId).emit('battleChallenge', {
        from: socket.id,
        username: data.username,
        nephew: nephew.name
      });
    });

    // Accetta sfida
    socket.on('acceptChallenge', (data) => {
      const { challengerId, nephewId, username } = data;
      const nephew = baseNephews.find(n => n.id === nephewId) || baseNephews[0];

      const p1 = { id: challengerId, username: data.challengerUsername, nephew: baseNephews[0] };
      const p2 = { id: socket.id, username, nephew };

      const battle = createBattle(p1, p2);

      // Avvisa entrambi i giocatori
      io.to(challengerId).emit('battleStart', battle);
      socket.emit('battleStart', battle);
    });

    // Esegui mossa
    socket.on('battleMove', (data) => {
      const { battleId, move } = data;
      const result = executeMove(battleId, socket.id, move);

      if (result.error) {
        socket.emit('battleError', result);
        return;
      }

      // Manda risultato a entrambi i giocatori
      const battle = activeBattles.get(battleId);
      if (battle) {
        io.to(battle.players.p1.id).emit('battleUpdate', result);
        io.to(battle.players.p2.id).emit('battleUpdate', result);
      }
    });
  });
}

module.exports = { setupBattles, activeBattles, baseNephews };