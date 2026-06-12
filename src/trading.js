// Sistema Trading - PortalMMO
const { db } = require('./database');

async function sendTradeOffer(senderId, receiverId, senderNephewId, receiverNephewId) {
  const nephew = await db('player_nephews')
    .where({ id: senderNephewId, user_id: senderId })
    .first();

  if (!nephew) return { error: 'Nipote non trovato o non ti appartiene!' };

  const [tradeId] = await db('trades').insert({
    sender_id: senderId,
    receiver_id: receiverId,
    sender_nephew_id: senderNephewId,
    receiver_nephew_id: receiverNephewId || null
  });

  return { 
    success: true, 
    tradeId,
    message: 'Offerta di scambio inviata! 🤝'
  };
}

async function acceptTrade(tradeId, receiverId) {
  const trade = await db('trades')
    .where({ id: tradeId, receiver_id: receiverId, status: 'pending' })
    .first();

  if (!trade) return { error: 'Offerta non trovata!' };

  await db('player_nephews')
    .where({ id: trade.sender_nephew_id })
    .update({ user_id: receiverId });

  if (trade.receiver_nephew_id) {
    await db('player_nephews')
      .where({ id: trade.receiver_nephew_id })
      .update({ user_id: trade.sender_id });
  }

  await db('trades').where({ id: tradeId }).update({ status: 'accepted' });

  return { success: true, message: 'Scambio completato! 🎉' };
}

async function rejectTrade(tradeId, receiverId) {
  const trade = await db('trades')
    .where({ id: tradeId, receiver_id: receiverId, status: 'pending' })
    .first();

  if (!trade) return { error: 'Offerta non trovata!' };

  await db('trades').where({ id: tradeId }).update({ status: 'rejected' });

  return { success: true, message: 'Offerta rifiutata!' };
}

async function getPendingTrades(userId) {
  return await db('trades').where({ receiver_id: userId, status: 'pending' });
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