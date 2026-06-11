// Sistema Inventario - PortalMMO
const { db } = require('./database');

// Oggetti base del gioco
const baseItems = [
  { name: 'Trappola Base', type: 'catch', description: 'Cattura Nipoti indeboliti' },
  { name: 'Pozione', type: 'heal', description: 'Ripristina 20 HP', healAmount: 20 },
  { name: 'Super Pozione', type: 'heal', description: 'Ripristina 50 HP', healAmount: 50 },
  { name: 'Antidoto', type: 'cure', description: 'Rimuove stati alterati' },
];

// Aggiungi oggetto
async function addItem(userId, itemName, quantity = 1) {
  const existing = await db.query(
    `SELECT * FROM inventory WHERE user_id = ? AND item_name = ?`,
    [userId, itemName]
  );

  if (existing.length > 0) {
    await db.query(
      `UPDATE inventory SET quantity = quantity + ? WHERE user_id = ? AND item_name = ?`,
      [quantity, userId, itemName]
    );
  } else {
    const itemType = baseItems.find(i => i.name === itemName)?.type || 'misc';
    await db.query(
      `INSERT INTO inventory (user_id, item_name, item_type, quantity) VALUES (?, ?, ?, ?)`,
      [userId, itemName, itemType, quantity]
    );
  }
}

// Rimuovi oggetto
async function removeItem(userId, itemName, quantity = 1) {
  const existing = await db.query(
    `SELECT * FROM inventory WHERE user_id = ? AND item_name = ?`,
    [userId, itemName]
  );

  if (existing.length === 0) return { error: 'Oggetto non trovato!' };
  if (existing[0].quantity < quantity) return { error: 'Non hai abbastanza oggetti!' };

  if (existing[0].quantity === quantity) {
    await db.query(
      `DELETE FROM inventory WHERE user_id = ? AND item_name = ?`,
      [userId, itemName]
    );
  } else {
    await db.query(
      `UPDATE inventory SET quantity = quantity - ? WHERE user_id = ? AND item_name = ?`,
      [quantity, userId, itemName]
    );
  }

  return { success: true };
}

// Ottieni inventario
async function getInventory(userId) {
  return await db.query(
    `SELECT * FROM inventory WHERE user_id = ?`,
    [userId]
  );
}

// Dai oggetti iniziali
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