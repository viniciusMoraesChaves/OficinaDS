const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

async function startTestServer(t) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

test('GET /api/saude confirma que o servidor responde', async (t) => {
  const baseUrl = await startTestServer(t);
  const response = await fetch(`${baseUrl}/api/saude`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    aplicacao: 'OficinaOS'
  });
});

test('rota de API inexistente responde JSON e HTTP 404', async (t) => {
  const baseUrl = await startTestServer(t);
  const response = await fetch(`${baseUrl}/api/nao-existe`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.erro, 'ROTA_NAO_ENCONTRADA');
});

test('frontend inicial é servido pelo Express', async (t) => {
  const baseUrl = await startTestServer(t);
  const response = await fetch(baseUrl);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /OficinaOS/);
  assert.match(response.headers.get('content-type'), /text\/html/);
});
