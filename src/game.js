// Giocatori connessi online
const onlinePlayers = new Map();

function setupGame(io) {
  io.on('connection', (socket) => {
    console.log(`Giocatore connesso: ${socket.id}`);

    // Giocatore entra nel gioco
    socket.on('join', (data) => {
      const player = {
        id: socket.id,
        username: data.username,
        x: 100,
        y: 100
      };

      // Aggiungi alla lista online
      onlinePlayers.set(socket.id, player);

      // Manda al giocatore la lista di chi è online
      socket.emit('currentPlayers', Array.from(onlinePlayers.values()));

      // Avvisa tutti gli altri del nuovo giocatore
      socket.broadcast.emit('playerJoined', player);

      console.log(`${data.username} è entrato nel gioco! Giocatori online: ${onlinePlayers.size}`);
    });

    // Giocatore si muove
    socket.on('move', (data) => {
      const player = onlinePlayers.get(socket.id);
      if (player) {
        player.x = data.x;
        player.y = data.y;
        onlinePlayers.set(socket.id, player);

        // Manda la nuova posizione a tutti
        socket.broadcast.emit('playerMoved', player);
      }
    });

    // Chat globale
    socket.on('chat', (data) => {
      const player = onlinePlayers.get(socket.id);
      if (player) {
        io.emit('chatMessage', {
          username: player.username,
          message: data.message,
          time: new Date().toLocaleTimeString()
        });
      }
    });

    // Giocatore disconnesso
    socket.on('disconnect', () => {
      const player = onlinePlayers.get(socket.id);
      if (player) {
        console.log(`${player.username} ha lasciato il gioco!`);
        onlinePlayers.delete(socket.id);
        io.emit('playerLeft', socket.id);
      }
    });
  });
}

module.exports = { setupGame, onlinePlayers };