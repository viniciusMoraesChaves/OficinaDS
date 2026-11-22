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

test('rotas de agendamento exigem login', async (t) => {
  const baseUrl = await startTestServer(t);

  const respostas = await Promise.all([
    fetch(`${baseUrl}/api/agendamentos`),
    fetch(`${baseUrl}/api/agendamentos/opcoes`),
    fetch(`${baseUrl}/api/agendamentos/meus`),
    fetch(`${baseUrl}/api/agendamentos/1/horarios?data=2026-10-20`),
    fetch(`${baseUrl}/api/agendamentos/1/reagendar`, { method: 'PATCH' })
  ]);

  for (const resposta of respostas) {
    assert.equal(resposta.status, 401);
    assert.equal((await resposta.json()).erro, 'NAO_AUTENTICADO');
  }
});
