const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

test('rotas de estoque exigem login', async (t) => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const base = `http://127.0.0.1:${server.address().port}`;

  for (const caminho of ['/api/pecas', '/api/pecas/categorias']) {
    const resposta = await fetch(`${base}${caminho}`);
    assert.equal(resposta.status, 401, caminho);
  }
});
