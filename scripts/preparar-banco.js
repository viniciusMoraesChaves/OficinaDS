#!/usr/bin/env node
// Cria o banco e executa, em ordem, os scripts da pasta database/ num servidor
// MySQL (ex.: Aiven). Cada script roda uma única vez: o que já foi aplicado fica
// registrado na tabela "schema_scripts" e é pulado nas próximas execuções.
//
// Uso:
//   DB_HOST=... DB_PORT=... DB_USER=... DB_PASSWORD=... DB_SSL=true npm run db:preparar
//   npm run db:preparar -- --simular     (só mostra o que seria executado, sem conectar)
//
// Não use em um banco local que você já preparou à mão: o script tentaria
// executar tudo de novo.

const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');
const { dividirSql, ehComandoDePermissao, compativelComMySql } = require('./lib/dividirSql');

const PASTA = path.resolve(__dirname, '../database');
const SIMULAR = process.argv.includes('--simular');

function listarScripts() {
  return fs
    .readdirSync(PASTA)
    .filter((nome) => /^\d+_.+\.sql$/.test(nome) && !nome.includes('consultas_para_estudar'))
    .sort();
}

function prepararComandos(arquivo, nomeBanco) {
  let texto = fs.readFileSync(path.join(PASTA, arquivo), 'utf8');

  if (nomeBanco !== 'oficina_ds') {
    texto = texto.replace(/\boficina_ds\b/g, nomeBanco);
  }

  const todos = dividirSql(texto);
  const executar = todos.filter((comando) => !ehComandoDePermissao(comando)).map(compativelComMySql);

  return { executar, pulados: todos.length - executar.length };
}

async function simular(nomeBanco) {
  console.log(`Simulação (nenhuma conexão será aberta). Banco: ${nomeBanco}\n`);

  for (const arquivo of listarScripts()) {
    const { executar, pulados } = prepararComandos(arquivo, nomeBanco);
    console.log(`  ${arquivo}: ${executar.length} comando(s), ${pulados} de permissão pulado(s)`);
  }
}

async function main() {
  const nomeBanco = env.db.database;

  if (!/^[A-Za-z0-9_]+$/.test(nomeBanco)) {
    throw new Error('DB_NAME só pode ter letras, números e "_".');
  }

  if (SIMULAR) {
    await simular(nomeBanco);
    return;
  }

  const conexao = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    ssl: env.db.ssl,
    charset: 'utf8mb4'
  });

  try {
    console.log(`Conectado a ${env.db.host}:${env.db.port}. Banco: ${nomeBanco}\n`);

    await conexao.query(
      `CREATE DATABASE IF NOT EXISTS \`${nomeBanco}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conexao.query(`USE \`${nomeBanco}\``);
    await conexao.query(
      `CREATE TABLE IF NOT EXISTS schema_scripts (
         nome VARCHAR(120) PRIMARY KEY,
         aplicado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
       ) ENGINE = InnoDB`
    );

    const [aplicados] = await conexao.query('SELECT nome FROM schema_scripts');
    const jaAplicados = new Set(aplicados.map((linha) => linha.nome));

    let executados = 0;

    for (const arquivo of listarScripts()) {
      if (jaAplicados.has(arquivo)) {
        console.log(`  = ${arquivo} (já aplicado)`);
        continue;
      }

      const { executar, pulados } = prepararComandos(arquivo, nomeBanco);

      for (const comando of executar) {
        try {
          await conexao.query(comando);
        } catch (error) {
          console.error(`\n✗ Erro em ${arquivo}:\n  ${error.message}\n`);
          console.error(`  Comando: ${comando.slice(0, 300).replace(/\s+/g, ' ')}...`);
          console.error(
            '\nCorrija o problema e rode de novo: os scripts anteriores já ficaram registrados.'
          );
          process.exitCode = 1;
          return;
        }
      }

      await conexao.query('INSERT INTO schema_scripts (nome) VALUES (?)', [arquivo]);
      executados += 1;
      console.log(`  ✓ ${arquivo} (${executar.length} comando(s), ${pulados} de permissão pulado(s))`);
    }

    console.log(`\nPronto: ${executados} script(s) aplicado(s).`);
  } finally {
    await conexao.end();
  }
}

main().catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exitCode = 1;
});
