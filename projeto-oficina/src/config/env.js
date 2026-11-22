const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const JWT_PADRAO = 'chave-de-desenvolvimento-trocar-em-producao';

function readPositiveInteger(value, fallback, name) {
  const parsed = Number.parseInt(value ?? fallback, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} precisa ser um número inteiro positivo.`);
  }

  return parsed;
}

// Bancos na nuvem (ex.: Aiven) exigem conexão criptografada.
// DB_SSL=true liga o SSL; se DB_SSL_CA (certificado da CA) for informado,
// o certificado do servidor passa a ser verificado.
function readSsl() {
  if (process.env.DB_SSL !== 'true') return undefined;

  const ca = (process.env.DB_SSL_CA || '').replace(/\\n/g, '\n').trim();
  return ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false };
}

// Fuso usado pelo banco e pela aplicação, no formato +HH:MM (ex.: -03:00).
function readTimezone() {
  const valor = process.env.DB_TIMEZONE;
  if (!valor) return undefined;

  if (!/^[+-]\d{2}:\d{2}$/.test(valor)) {
    throw new Error('DB_TIMEZONE deve estar no formato +HH:MM, por exemplo -03:00.');
  }

  return valor;
}

const jwtSecret = process.env.JWT_SECRET || JWT_PADRAO;

// Em produção a chave padrão seria pública (está no código), então não sobe com ela.
if (process.env.NODE_ENV === 'production' && jwtSecret === JWT_PADRAO) {
  throw new Error('Defina JWT_SECRET com um texto secreto e longo antes de publicar o sistema.');
}

const env = Object.freeze({
  port: readPositiveInteger(process.env.PORT, 3000, 'PORT'),
  jwtSecret,
  // Com CADASTRO_OFICINA_PUBLICO=false, só clientes se cadastram sozinhos;
  // contas de equipe passam a ser criadas por um Administrador.
  cadastroOficinaPublico: process.env.CADASTRO_OFICINA_PUBLICO !== 'false',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: readPositiveInteger(process.env.DB_PORT, 3306, 'DB_PORT'),
    user: process.env.DB_USER || 'oficina_app',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'oficina_ds',
    ssl: readSsl(),
    timezone: readTimezone(),
    connectionLimit: readPositiveInteger(
      process.env.DB_CONNECTION_LIMIT,
      10,
      'DB_CONNECTION_LIMIT'
    )
  }
});

module.exports = env;
