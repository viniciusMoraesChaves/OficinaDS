const app = require('./app');
const env = require('./config/env');
const { checkDatabaseConnection, pool } = require('./config/database');

async function start() {
  try {
    await checkDatabaseConnection();
    console.log('✓ Conexão com o MySQL estabelecida.');

    const server = app.listen(env.port, () => {
      console.log(`✓ OficinaOS disponível em http://localhost:${env.port}`);
    });

    async function shutdown(signal) {
      console.log(`\n${signal} recebido. Encerrando...`);
      server.close(async () => {
        await pool.end();
        process.exit(0);
      });
    }

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Não foi possível iniciar a aplicação.');
    console.error(error.message);
    console.error('Confira o MySQL, o banco oficina_ds e as credenciais do arquivo .env.');
    await pool.end();
    process.exit(1);
  }
}

start();
