const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

function readPositiveInteger(value, fallback, name) {
  const parsed = Number.parseInt(value ?? fallback, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} precisa ser um número inteiro positivo.`);
  }

  return parsed;
}

const env = Object.freeze({
  port: readPositiveInteger(process.env.PORT, 3000, 'PORT'),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: readPositiveInteger(process.env.DB_PORT, 3306, 'DB_PORT'),
    user: process.env.DB_USER || 'oficina_app',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'oficina_ds',
    connectionLimit: readPositiveInteger(
      process.env.DB_CONNECTION_LIMIT,
      10,
      'DB_CONNECTION_LIMIT'
    )
  }
});

module.exports = env;
