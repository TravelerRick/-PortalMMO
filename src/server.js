const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: { origin: "*" }
});

// Database
require('./database');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Route base
app.get('/', (req, res) => {
  res.json({ message: 'PortalMMO Server Online! 🛸' });
});

// Route giocatori online
app.get('/online', (req, res) => {
  const { onlinePlayers } = require('./game');
  res.json({ 
    count: onlinePlayers.size,
    players: Array.from(onlinePlayers.values())
  });
});

// Route Nipoti base
app.get('/nephews', (req, res) => {
  const { baseNephews } = require('./battle');
  res.json(baseNephews);
});

// Route inventario
app.get('/inventory/:userId', (req, res) => {
  const { getInventory } = require('./inventory');
  const inventory = getInventory(req.params.userId);
  res.json(inventory);
});

// Route profilo giocatore
app.get('/profile/:userId', (req, res) => {
  const { getPlayerProfile } = require('./progression');
  const profile = getPlayerProfile(req.params.userId);
  if (!profile) return res.status(404).json({ error: 'Giocatore non trovato!' });
  res.json(profile);
});

// Route coda PvP
app.get('/pvp/queue', (req, res) => {
  const { pvpQueue } = require('./pvp');
  res.json({ 
    count: pvpQueue.size,
    players: Array.from(pvpQueue.values()).map(p => p.username)
  });
});

// Route trades pendenti
app.get('/trades/:userId', (req, res) => {
  const { getPendingTrades } = require('./trading');
  const trades = getPendingTrades(req.params.userId);
  res.json(trades);
});

// Setup gioco multiplayer
const { setupGame } = require('./game');
setupGame(io);

// Setup battaglie
const { setupBattles } = require('./battle');
setupBattles(io);

// Setup cattura
const { setupCatch } = require('./catch');
setupCatch(io);

// Setup inventario
const { setupInventory } = require('./inventory');
setupInventory(io);

// Setup progressione
const { setupProgression } = require('./progression');
setupProgression(io);

// Setup PvP
const { setupPvp } = require('./pvp');
setupPvp(io);

// Setup trading
const { setupTrading } = require('./trading');
setupTrading(io);

// Avvia server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`PortalMMO Server avviato sulla porta ${PORT} 🚀`);
});