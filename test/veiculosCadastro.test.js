const test = require('node:test');
const assert = require('node:assert/strict');
const { parseNovoVeiculo } = require('../src/utils/veiculos');

const exemplo = {
  clienteId: '3', placa: 'abc-1d23', marca: ' Fiat ', modelo: ' Argo ',
  ano: '2022', cor: ' Prata ', chassi: ''
};

test('normaliza os dados de veículo e aceita placa Mercosul', () => {
  assert.deepEqual(parseNovoVeiculo(exemplo), {
    clienteId: 3, placa: 'ABC1D23', marca: 'Fiat', modelo: 'Argo',
    ano: 2022, cor: 'Prata', chassi: null
  });
});

test('aceita placa antiga, cor e chassi opcionais', () => {
  const dados = parseNovoVeiculo({ ...exemplo, placa: 'abc 1234', cor: '', chassi: '9bwzzzz377vt004251' });
  assert.equal(dados.placa, 'ABC1234');
  assert.equal(dados.cor, null);
  assert.equal(dados.chassi, '9BWZZZZ377VT004251');
});

test('rejeita placa inválida, cliente inválido e dados obrigatórios vazios', () => {
  assert.throws(() => parseNovoVeiculo({ ...exemplo, placa: 'AB12' }), /placa válida/);
  assert.throws(() => parseNovoVeiculo({ ...exemplo, clienteId: 0 }), /cliente válido/);
  assert.throws(() => parseNovoVeiculo({ ...exemplo, marca: ' ' }), /Marca/);
  assert.throws(() => parseNovoVeiculo({ ...exemplo, modelo: '' }), /Modelo/);
  assert.throws(() => parseNovoVeiculo({ ...exemplo, ano: 1800 }), /ano do veículo/);
  assert.throws(() => parseNovoVeiculo({ ...exemplo, chassi: 'A'.repeat(31) }), /Chassi/);
});

// Simula o banco: não precisamos acessar dados reais para conferir a consulta e gravação.
const databasePath = require.resolve('../src/config/database');
const chamadas = [];
let existe = true;
let erroNaInsercao = null;
require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: {
    pool: {
      async execute(sql, params = []) {
        chamadas.push({ sql, params });
        if (sql.includes('SELECT 1 FROM cliente')) return [existe ? [{ ok: 1 }] : []];
        if (sql.includes('INSERT INTO veiculo')) {
          if (erroNaInsercao) throw erroNaInsercao;
          return [{ insertId: 42 }];
        }
        throw new Error('Consulta inesperada no teste.');
      }
    }
  }
};

const controller = require('../src/controllers/veiculosController');

function respostaFake() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('cria veículo para cliente ativo e retorna HTTP 201', async () => {
  chamadas.length = 0;
  existe = true;
  erroNaInsercao = null;
  const res = respostaFake();
  let falha;
  await controller.create({ body: exemplo }, res, (e) => { falha = e; });
  assert.equal(falha, undefined);
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, { dados: { id: 42 } });
  assert.match(chamadas[0].sql, /ativo = 1/);
  assert.deepEqual(chamadas[0].params, [3]);
  assert.match(chamadas[1].sql, /INSERT INTO veiculo/);
  assert.deepEqual(chamadas[1].params, [3, 'ABC1D23', 'Fiat', 'Argo', 2022, 'Prata', null]);
});

test('não insere veículo se o cliente não estiver ativo ou não existir', async () => {
  chamadas.length = 0;
  existe = false;
  const res = respostaFake();
  let falha;
  await controller.create({ body: exemplo }, res, (e) => { falha = e; });
  assert.equal(falha?.statusCode, 400);
  assert.match(falha.message, /não existe ou está inativo/);
  assert.equal(chamadas.length, 1);
});

test('propaga placa ou chassi duplicados para tratamento HTTP 409', async () => {
  chamadas.length = 0;
  existe = true;
  erroNaInsercao = Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
  let falha;
  await controller.create({ body: exemplo }, respostaFake(), (e) => { falha = e; });
  assert.equal(falha.code, 'ER_DUP_ENTRY');
  erroNaInsercao = null;
});
