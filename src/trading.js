// Sistema Trading - PortalMMO
const { db } = require('./database');

// Invia offerta di scambio
async function sendTradeOffer(senderId, receiverId, senderNephewId, receiverNephewId) {
  const nephew = await db.query(
    `SELECT * FROM player_nephews WHERE id = ? AND user_id = ?`,
    [senderNephewId, senderId]
  );

  if (nephew.length === 0) return { error: 'Nipote non trovato o non ti appartiene!' };

  await db.query(
    `INSERT INTO trades (sender_id, receiver_id, sender_nephew_id, receiver_nephew_id) VALUES (?, ?, ?, ?)`,
    [senderId, receiverId, senderNephewId, receiverNephewId || null]
  );

  const trade = await db.query(
    `SELECT id FROM trades WHERE sender_id = ? ORDER BY id DESC LIMIT 1`,
    [senderId]
  );

  return { 
    success: true, 
    tradeId: trade[0].id,
    message: 'Offerta di scambio inviata! 🤝'
  };
}

// Accetta offerta
async function acceptTrade(tradeId, receiverId) {
  const trades = await db.query(
    `SELECT * FROM trades WHERE id = ? AND receiver_id = ? AND status = ?`,
    [tradeId, receiverId, 'pending']
  );

  if (trades.length === 0) return { error: 'Offerta non trovata!' };
  const trade = trades[0];

  await db.query(
    `UPDATE player_nephews SET user_id = ? WHERE id = ?`,
    [receiverId, trade.sender_nephew_id]
  );

  if (trade.receiver_nephew_id) {
    await db.query(
      `UPDATE player_nephews SET user_id = ? WHERE id = ?`,
      [trade.sender_id, trade.receiver_nephew_id]
    );
  }

  await db.query(
    `UPDATE trades SET status = ? WHERE id = ?`,
    ['accepted', tradeId]
  );

  return { success: true, message: 'Scambio completato! 🎉' };
}

// Rifiuta offerta
async function rejectTrade(tradeId, receiverId) {
  const trades = await db.query(
    `SELECT * FROM trades WHERE id = ? AND receiver_id = ? AND status = ?`,
    [tradeId, receiverId, 'pending']
  );

  if (trades.length === 0) return { error: 'Offerta non trovata!' };

  await db.query(
    `UPDATE trades SET status = ? WHERE id = ?`,
    ['rejected', tradeId]
  );

  return { success: true, message: 'Offerta rifiutata!' };
}

// Ottieni offerte pendenti
async function getPendingTrades(userId) {
  return await db.query(
    `SELECT * FROM trades WHERE receiver_id = ? AND status = ?`,
    [userId, 'pending']
  );
}

function setupTrading(io) {
  io.on('connection', (socket) => {
    socket.on('sendTrade', async (data) => {
      const { senderId, receiverId, senderNephewId, receiverNephewId } = data;
      const result = await sendTradeOffer(senderId, receiverId, senderNephewId, receiverNephewId);
      
      if (result.error) {
        socket.emit('tradeError', result);
        return;
      }

      socket.emit('tradeSent', result);
      io.to(data.receiverSocketId).emit('tradeReceived', {
        tradeId: result.tradeId,
        from: data.senderUsername,
        message: `${data.senderUsername} vuole scambiare con te! 🤝`
      });
    });

    socket.on('acceptTrade', async (data) => {
      const result = await acceptTrade(data.tradeId, data.userId);
      socket.emit('tradeResult', result);
      
      if (result.success) {
        io.to(data.senderSocketId).emit('tradeResult', { 
          success: true,
          message: 'Il tuo scambio è stato accettato! 🎉'
        });
      }
    });

    socket.on('rejectTrade', async (data) => {
      const result = await rejectTrade(data.tradeId, data.userId);
      socket.emit('tradeResult', result);

      if (result.success) {
        io.to(data.senderSocketId).emit('tradeResult', {
          success: false,
          message: 'Il tuo scambio è stato rifiutato!'
        });
      }
    });

    socket.on('getPendingTrades', async (data) => {
      const trades = await getPendingTrades(data.userId);
      socket.emit('pendingTrades', trades);
    });
  });
}

module.exports = { setupTrading, sendTradeOffer, acceptTrade, rejectTrade, getPendingTrades };