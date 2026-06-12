// Sistema Inventario - PortalMMO
const { db } = require('./database');

const baseItems = [
  { name: 'Trappola Base', type: 'catch', description: 'Cattura Nipoti indeboliti' },
  { name: 'Pozione', type: 'heal', description: 'Ripristina 20 HP', healAmount: 20 },
  { name: 'Super Pozione', type: 'heal', description: 'Ripristina 50 HP', healAmount: 50 },
  { name: 'Antidoto', type: 'cure', description: 'Rimuove stati alterati' },
];

async function addItem(userId, itemName, quantity = 1) {
  const existing = await db('inventory')
    .where({ user_id: userId, item_name: itemName })
    .first();

  if (existing) {
    await db('inventory')
      .where({ user_id: userId, item_name: itemName })
      .increment('quantity', quantity);
  } else {
    const itemType = baseItems.find(i => i.name === itemName)?.type || 'misc';
    await db('inventory').insert({
      user_id: userId,
      item_name: itemName,
      item_type: itemType,
      quantity
    });
  }
}

async function removeItem(userId, itemName, quantity = 1) {
  const existing = await db('inventory')
    .where({ user_id: userId, item_name: itemName })
    .first();

  if (!existing) return { error: 'Oggetto non trovato!' };
  if (existing.quantity < quantity) return { error: 'Non hai abbastanza oggetti!' };

  if (existing.quantity === quantity) {
    await db('inventory')
      .where({ user_id: userId, item_name: itemName })
      .delete();
  } else {
    await db('inventory')
      .where({ user_id: userId, item_name: itemName })
      .decrement('quantity', quantity);
  }

  return { success: true };
}

async function getInventory(userId) {
  return await db('inventory').where({ user_id: userId });
}

async function giveStarterItems(userId) {
  await addItem(userId, 'Trappola Base', 5);
  await addItem(userId, 'Pozione', 3);
}

function setupInventory(io) {
  io.on('connection', (socket) => {
    socket.on('getInventory', async (data) => {
      const inventory = await getInventory(data.userId);
      socket.emit('inventoryData', inventory);
    });

    socket.on('useItem', async (data) => {
      const { userId, itemName } = data;
      const result = await removeItem(userId, itemName, 1);
      
      if (result.error) {
        socket.emit('itemError', result);
        return;
      }

      const inventory = await getInventory(userId);
      socket.emit('itemUsed', { 
        message: `Hai usato ${itemName}!`,
        inventory
      });
    });
  });
}

module.exports = { setupInventory, addItem, removeItem, getInventory, giveStarterItems, baseItems };