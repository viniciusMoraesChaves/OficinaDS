const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

test('rotas de estoque exigem login', async (t) => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const base = `http://127.0.0.1:${server.address().port}`;

  const requisicoes = [
    ['GET', '/api/pecas'],
    ['GET', '/api/pecas/categorias'],
    ['GET', '/api/pecas/opcoes'],
    ['GET', '/api/pecas/baixas'],
    ['POST', '/api/pecas/1/baixas'],
    ['GET', '/api/atendimentos/1/pecas'],
    ['POST', '/api/atendimentos/1/pecas'],
    ['PATCH', '/api/atendimentos/1/pecas/1'],
    ['DELETE', '/api/atendimentos/1/pecas/1']
  ];

  for (const [method, caminho] of requisicoes) {
    const resposta = await fetch(`${base}${caminho}`, { method });
    assert.equal(resposta.status, 401, caminho);
  }
});
