const { Pool } = require("pg");
const pgvector = require('pgvector/pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: {
  //   rejectUnauthorized: false
  // }
  // uncomment it when deploy 
});

pool.on('connect', async (client) => {
  await pgvector.registerTypes(client);
});

module.exports = pool;