// Sistema Inventario - PortalMMO

const db = require('./database');

// Crea tabella inventario nel database
db.exec(`
  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    item_type TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Oggetti base del gioco
const baseItems = [
  { name: 'Trappola Base', type: 'catch', description: 'Cattura Nipoti indeboliti' },
  { name: 'Pozione', type: 'heal', description: 'Ripristina 20 HP', healAmount: 20 },
  { name: 'Super Pozione', type: 'heal', description: 'Ripristina 50 HP', healAmount: 50 },
  { name: 'Antidoto', type: 'cure', description: 'Rimuove stati alterati' },
];

// Aggiungi oggetto all'inventario
function addItem(userId, itemName, quantity = 1) {
  const existing = db.prepare(`
    SELECT * FROM inventory WHERE user_id = ? AND item_name = ?
  `).get(userId, itemName);

  if (existing) {
    db.prepare(`
      UPDATE inventory SET quantity = quantity + ? WHERE user_id = ? AND item_name = ?
    `).run(quantity, userId, itemName);
  } else {
    db.prepare(`
      INSERT INTO inventory (user_id, item_name, item_type, quantity) VALUES (?, ?, ?, ?)
    `).run(userId, itemName, baseItems.find(i => i.name === itemName)?.type || 'misc', quantity);
  }
}

// Rimuovi oggetto dall'inventario
function removeItem(userId, itemName, quantity = 1) {
  const existing = db.prepare(`
    SELECT * FROM inventory WHERE user_id = ? AND item_name = ?
  `).get(userId, itemName);

  if (!existing) return { error: 'Oggetto non trovato!' };
  if (existing.quantity < quantity) return { error: 'Non hai abbastanza oggetti!' };

  if (existing.quantity === quantity) {
    db.prepare(`
      DELETE FROM inventory WHERE user_id = ? AND item_name = ?
    `).run(userId, itemName);
  } else {
    db.prepare(`
      UPDATE inventory SET quantity = quantity - ? WHERE user_id = ? AND item_name = ?
    `).run(quantity, userId, itemName);
  }

  return { success: true };
}

// Ottieni inventario giocatore
function getInventory(userId) {
  return db.prepare(`
    SELECT * FROM inventory WHERE user_id = ?
  `).all(userId);
}

// Dai oggetti iniziali al nuovo giocatore
function giveStarterItems(userId) {
  addItem(userId, 'Trappola Base', 5);
  addItem(userId, 'Pozione', 3);
}

function setupInventory(io) {
  io.on('connection', (socket) => {

    // Ottieni inventario
    socket.on('getInventory', (data) => {
      const inventory = getInventory(data.userId);
      socket.emit('inventoryData', inventory);
    });

    // Usa oggetto
    socket.on('useItem', (data) => {
      const { userId, itemName } = data;
      const result = removeItem(userId, itemName, 1);
      
      if (result.error) {
        socket.emit('itemError', result);
        return;
      }

      socket.emit('itemUsed', { 
        message: `Hai usato ${itemName}!`,
        inventory: getInventory(userId)
      });
    });
  });
}

module.exports = { setupInventory, addItem, removeItem, getInventory, giveStarterItems, baseItems };