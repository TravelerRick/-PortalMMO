// Sistema Trading - PortalMMO

const db = require('./database');

// Crea tabella offerte di trading
db.exec(`
  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    sender_nephew_id INTEGER NOT NULL,
    receiver_nephew_id INTEGER,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
  )
`);

// Invia offerta di scambio
function sendTradeOffer(senderId, receiverId, senderNephewId, receiverNephewId) {
  // Controlla che il Nipote appartenga al mittente
  const nephew = db.prepare(
    'SELECT * FROM player_nephews WHERE id = ? AND user_id = ?'
  ).get(senderNephewId, senderId);

  if (!nephew) return { error: 'Nipote non trovato o non ti appartiene!' };

  // Crea offerta
  const insert = db.prepare(`
    INSERT INTO trades (sender_id, receiver_id, sender_nephew_id, receiver_nephew_id)
    VALUES (?, ?, ?, ?)
  `);
  const result = insert.run(senderId, receiverId, senderNephewId, receiverNephewId || null);

  return { 
    success: true, 
    tradeId: result.lastInsertRowid,
    message: 'Offerta di scambio inviata! 🤝'
  };
}

// Accetta offerta di scambio
function acceptTrade(tradeId, receiverId) {
  const trade = db.prepare(
    'SELECT * FROM trades WHERE id = ? AND receiver_id = ? AND status = ?'
  ).get(tradeId, receiverId, 'pending');

  if (!trade) return { error: 'Offerta non trovata!' };

  // Scambia i Nipoti
  db.prepare(
    'UPDATE player_nephews SET user_id = ? WHERE id = ?'
  ).run(receiverId, trade.sender_nephew_id);

  if (trade.receiver_nephew_id) {
    db.prepare(
      'UPDATE player_nephews SET user_id = ? WHERE id = ?'
    ).run(trade.sender_id, trade.receiver_nephew_id);
  }

  // Aggiorna stato offerta
  db.prepare(
    'UPDATE trades SET status = ? WHERE id = ?'
  ).run('accepted', tradeId);

  return { 
    success: true, 
    message: 'Scambio completato! 🎉'
  };
}

// Rifiuta offerta
function rejectTrade(tradeId, receiverId) {
  const trade = db.prepare(
    'SELECT * FROM trades WHERE id = ? AND receiver_id = ? AND status = ?'
  ).get(tradeId, receiverId, 'pending');

  if (!trade) return { error: 'Offerta non trovata!' };

  db.prepare(
    'UPDATE trades SET status = ? WHERE id = ?'
  ).run('rejected', tradeId);

  return { 
    success: true, 
    message: 'Offerta rifiutata!'
  };
}

// Ottieni offerte pendenti
function getPendingTrades(userId) {
  return db.prepare(
    'SELECT * FROM trades WHERE receiver_id = ? AND status = ?'
  ).all(userId, 'pending');
}

function setupTrading(io) {
  io.on('connection', (socket) => {

    // Invia offerta
    socket.on('sendTrade', (data) => {
      const { senderId, receiverId, senderNephewId, receiverNephewId } = data;
      const result = sendTradeOffer(senderId, receiverId, senderNephewId, receiverNephewId);
      
      if (result.error) {
        socket.emit('tradeError', result);
        return;
      }

      socket.emit('tradeSent', result);
      
      // Avvisa il destinatario
      io.to(data.receiverSocketId).emit('tradeReceived', {
        tradeId: result.tradeId,
        from: data.senderUsername,
        message: `${data.senderUsername} vuole scambiare con te! 🤝`
      });
    });

    // Accetta offerta
    socket.on('acceptTrade', (data) => {
      const result = acceptTrade(data.tradeId, data.userId);
      socket.emit('tradeResult', result);
      
      if (result.success) {
        io.to(data.senderSocketId).emit('tradeResult', { 
          success: true,
          message: 'Il tuo scambio è stato accettato! 🎉'
        });
      }
    });

    // Rifiuta offerta
    socket.on('rejectTrade', (data) => {
      const result = rejectTrade(data.tradeId, data.userId);
      socket.emit('tradeResult', result);

      if (result.success) {
        io.to(data.senderSocketId).emit('tradeResult', {
          success: false,
          message: 'Il tuo scambio è stato rifiutato!'
        });
      }
    });

    // Ottieni offerte pendenti
    socket.on('getPendingTrades', (data) => {
      const trades = getPendingTrades(data.userId);
      socket.emit('pendingTrades', trades);
    });
  });
}

module.exports = { setupTrading, sendTradeOffer, acceptTrade, rejectTrade, getPendingTrades };