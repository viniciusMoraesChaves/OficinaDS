const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

test('rota do painel exige login', async (t) => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const resposta = await fetch(`http://127.0.0.1:${server.address().port}/api/painel`);

  assert.equal(resposta.status, 401);
});
