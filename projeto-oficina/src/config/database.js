const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  ssl: env.db.ssl,
  timezone: env.db.timezone,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  queueLimit: 0,
  charset: 'utf8mb4',
  decimalNumbers: true,
  dateStrings: ['DATE'],
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Faz o NOW()/CURRENT_TIMESTAMP do banco usarem o mesmo fuso da aplicação.
if (env.db.timezone) {
  pool.pool.on('connection', (connection) => {
    connection.query(`SET time_zone = '${env.db.timezone}'`);
  });
}

async function checkDatabaseConnection() {
  const connection = await pool.getConnection();

  try {
    await connection.query('SELECT 1');
  } finally {
    connection.release();
  }
}

module.exports = { pool, checkDatabaseConnection };
