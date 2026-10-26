const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  dividirSql,
  ehComandoDePermissao,
  compativelComMySql
} = require('../scripts/lib/dividirSql');

test('dividirSql separa comandos e ignora comentários com ponto e vírgula', () => {
  const comandos = dividirSql(`
    -- Comentário com ; e com 'aspas soltas
    USE oficina_ds;
    /* bloco; com ponto e vírgula */
    INSERT INTO cargo (nome) VALUES ('Gerente; chefe'), ('Atendente');
    SELECT 1
  `);

  assert.deepEqual(comandos, [
    'USE oficina_ds',
    "INSERT INTO cargo (nome) VALUES ('Gerente; chefe'), ('Atendente')",
    'SELECT 1'
  ]);
});

test('dividirSql respeita aspas duplicadas e barra invertida', () => {
  const comandos = dividirSql(`INSERT INTO t VALUES ('d''água; sim', 'a\\'b;c'); SELECT 2;`);

  assert.equal(comandos.length, 2);
  assert.equal(comandos[1], 'SELECT 2');
});

test('ehComandoDePermissao reconhece GRANT, usuários e FLUSH', () => {
  assert.equal(ehComandoDePermissao("GRANT SELECT ON a.* TO 'x'@'localhost'"), true);
  assert.equal(ehComandoDePermissao("create user if not exists 'x'@'localhost'"), true);
  assert.equal(ehComandoDePermissao("ALTER USER 'x'@'localhost' IDENTIFIED BY 'y'"), true);
  assert.equal(ehComandoDePermissao('FLUSH PRIVILEGES'), true);
  assert.equal(ehComandoDePermissao('ALTER TABLE usuario ADD COLUMN a INT'), false);
  assert.equal(ehComandoDePermissao('SELECT 1'), false);
});

test('compativelComMySql remove IF NOT EXISTS de ADD COLUMN e ADD INDEX', () => {
  assert.equal(
    compativelComMySql('ALTER TABLE usuario ADD COLUMN IF NOT EXISTS id_perfil INT'),
    'ALTER TABLE usuario ADD COLUMN id_perfil INT'
  );
  assert.equal(
    compativelComMySql('ALTER TABLE usuario ADD INDEX IF NOT EXISTS idx_a (id_perfil)'),
    'ALTER TABLE usuario ADD INDEX idx_a (id_perfil)'
  );
  assert.equal(
    compativelComMySql('CREATE TABLE IF NOT EXISTS peca (id INT)'),
    'CREATE TABLE IF NOT EXISTS peca (id INT)'
  );
});

test('todos os scripts da pasta database são divididos sem sobras de comentário', () => {
  const pasta = path.resolve(__dirname, '../database');
  const arquivos = fs.readdirSync(pasta).filter((nome) => nome.endsWith('.sql'));

  assert.ok(arquivos.length > 0);

  for (const arquivo of arquivos) {
    const comandos = dividirSql(fs.readFileSync(path.join(pasta, arquivo), 'utf8'));

    assert.ok(comandos.length > 0, `${arquivo} não gerou comandos`);

    for (const comando of comandos) {
      assert.doesNotMatch(comando, /^--/, `${arquivo}: comentário virou comando`);
    }
  }
});
