const test = require('node:test');
const assert = require('node:assert/strict');

const envPath = require.resolve('../src/config/env');

function carregarEnv(variaveis) {
  const antes = { ...process.env };

  for (const [chave, valor] of Object.entries(variaveis)) {
    if (valor === undefined) delete process.env[chave];
    else process.env[chave] = valor;
  }

  delete require.cache[envPath];

  try {
    return require('../src/config/env');
  } finally {
    for (const chave of Object.keys(variaveis)) {
      if (antes[chave] === undefined) delete process.env[chave];
      else process.env[chave] = antes[chave];
    }
    delete require.cache[envPath];
  }
}

test('em produção, a chave JWT padrão é recusada', () => {
  assert.throws(
    () => carregarEnv({ NODE_ENV: 'production', JWT_SECRET: '' }),
    /JWT_SECRET/
  );
});

test('em produção, uma chave própria é aceita', () => {
  const env = carregarEnv({ NODE_ENV: 'production', JWT_SECRET: 'uma-chave-longa-e-secreta' });

  assert.equal(env.jwtSecret, 'uma-chave-longa-e-secreta');
});

test('DB_SSL=true liga o SSL; com CA informada, verifica o certificado', () => {
  const semCa = carregarEnv({ DB_SSL: 'true', DB_SSL_CA: '' });
  const comCa = carregarEnv({ DB_SSL: 'true', DB_SSL_CA: 'linha1\\nlinha2' });
  const desligado = carregarEnv({ DB_SSL: undefined, DB_SSL_CA: undefined });

  assert.deepEqual(semCa.db.ssl, { rejectUnauthorized: false });
  assert.deepEqual(comCa.db.ssl, { ca: 'linha1\nlinha2', rejectUnauthorized: true });
  assert.equal(desligado.db.ssl, undefined);
});

test('DB_TIMEZONE só aceita o formato +HH:MM', () => {
  assert.equal(carregarEnv({ DB_TIMEZONE: '-03:00' }).db.timezone, '-03:00');
  assert.throws(() => carregarEnv({ DB_TIMEZONE: "'; DROP TABLE x" }), /DB_TIMEZONE/);
});

test('CADASTRO_OFICINA_PUBLICO=false desativa o cadastro de equipe', () => {
  assert.equal(carregarEnv({ CADASTRO_OFICINA_PUBLICO: 'false' }).cadastroOficinaPublico, false);
  assert.equal(carregarEnv({ CADASTRO_OFICINA_PUBLICO: undefined }).cadastroOficinaPublico, true);
});
