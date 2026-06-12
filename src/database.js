const knex = require('knex');
const path = require('path');

const db = knex({
  client: 'better-sqlite3',
  connection: {
    filename: path.join(__dirname, '../portalmmo.db')
  },
  useNullAsDefault: true
});

async function initDatabase() {
  // Tabella utenti
  if (!await db.schema.hasTable('users')) {
    await db.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('username').unique().notNullable();
      table.string('password').notNullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // Tabella giocatori
  if (!await db.schema.hasTable('players')) {
    await db.schema.createTable('players', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unique().notNullable();
      table.integer('level').defaultTo(1);
      table.integer('experience').defaultTo(0);
      table.integer('portal_fragments').defaultTo(100);
    });
  }

  // Tabella nipoti
  if (!await db.schema.hasTable('player_nephews')) {
    await db.schema.createTable('player_nephews', (table) => {
      table.increments('id').primary();
      table.integer('user_id').notNullable();
      table.integer('nephew_id').notNullable();
      table.string('nickname');
      table.integer('level').defaultTo(1);
      table.integer('experience').defaultTo(0);
      table.integer('hp').notNullable();
      table.integer('atk').notNullable();
      table.integer('def').notNullable();
      table.integer('spd').notNullable();
      table.timestamp('caught_at').defaultTo(db.fn.now());
    });
  }

  // Tabella inventario
  if (!await db.schema.hasTable('inventory')) {
    await db.schema.createTable('inventory', (table) => {
      table.increments('id').primary();
      table.integer('user_id').notNullable();
      table.string('item_name').notNullable();
      table.string('item_type').notNullable();
      table.integer('quantity').defaultTo(1);
    });
  }

  // Tabella trades
  if (!await db.schema.hasTable('trades')) {
    await db.schema.createTable('trades', (table) => {
      table.increments('id').primary();
      table.integer('sender_id').notNullable();
      table.integer('receiver_id').notNullable();
      table.integer('sender_nephew_id').notNullable();
      table.integer('receiver_nephew_id');
      table.string('status').defaultTo('pending');
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  console.log('Database PortalMMO pronto! 🛸');
}

module.exports = { db, initDatabase };