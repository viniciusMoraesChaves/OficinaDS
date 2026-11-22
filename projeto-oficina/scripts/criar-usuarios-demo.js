#!/usr/bin/env node
// Cria três contas de demonstração (Administrador, Funcionário e Cliente) para
// quem for avaliar o sistema. Se a conta já existir, ela é mantida como está.
//
// Uso:
//   DB_HOST=... DB_PORT=... DB_USER=... DB_PASSWORD=... DB_SSL=true npm run db:demo
//   DEMO_SENHA='Minha@Senha1' npm run db:demo     (senha própria; sem isso, uma é gerada)

const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/database');
const perfisRepository = require('../src/repositories/perfisRepository');
const cargosRepository = require('../src/repositories/cargosRepository');
const contasRepository = require('../src/repositories/contasRepository');
const { PERFIS } = require('../src/utils/perfis');

const senha = process.env.DEMO_SENHA || crypto.randomBytes(9).toString('base64url');

async function emailExiste(email) {
  const [rows] = await pool.execute('SELECT 1 FROM usuario WHERE email = ? LIMIT 1', [email]);
  return rows.length > 0;
}

async function idDoCargo(nome) {
  const [rows] = await pool.execute('SELECT id_cargo AS id FROM cargo WHERE nome = ? LIMIT 1', [nome]);
  return rows[0] ? rows[0].id : null;
}

async function perfilOuFalhar(nome) {
  const perfil = await perfisRepository.buscarPorNome(nome);
  if (!perfil) throw new Error(`Perfil ${nome} não encontrado. Rode antes: npm run db:preparar`);
  return perfil;
}

async function criarContas() {
  const senhaHash = await bcrypt.hash(senha, 10);
  const resultado = [];

  async function criarSe(email, perfil, criar) {
    if (await emailExiste(email)) {
      resultado.push({ perfil, email, situacao: 'já existia (senha mantida)' });
      return;
    }

    await criar();
    resultado.push({ perfil, email, situacao: 'criada' });
  }

  const cargoGerente = await idDoCargo('Gerente');
  const cargoPadrao = await cargosRepository.findPadraoCadastro();

  if (!cargoGerente || !cargoPadrao) {
    throw new Error('Cargos não encontrados. Rode antes: npm run db:preparar');
  }

  const perfilAdmin = await perfilOuFalhar(PERFIS.ADMINISTRADOR);
  const perfilFuncionario = await perfilOuFalhar(PERFIS.FUNCIONARIO);
  const perfilCliente = await perfilOuFalhar(PERFIS.CLIENTE);

  await criarSe('admin@oficinads.test', PERFIS.ADMINISTRADOR, () =>
    contasRepository.criarContaFuncionario({
      email: 'admin@oficinads.test',
      senhaHash,
      idPerfil: perfilAdmin.id,
      nome: 'Administrador Demo',
      cpf: '99999999901',
      telefone: null,
      dataAdmissao: null,
      idCargo: cargoGerente
    })
  );

  await criarSe('funcionario@oficinads.test', PERFIS.FUNCIONARIO, () =>
    contasRepository.criarContaFuncionario({
      email: 'funcionario@oficinads.test',
      senhaHash,
      idPerfil: perfilFuncionario.id,
      nome: 'Funcionário Demo',
      cpf: '99999999902',
      telefone: null,
      dataAdmissao: null,
      idCargo: cargoPadrao.id
    })
  );

  await criarSe('cliente@oficinads.test', PERFIS.CLIENTE, () =>
    contasRepository.criarContaCliente({
      email: 'cliente@oficinads.test',
      senhaHash,
      idPerfil: perfilCliente.id,
      nome: 'Cliente Demo',
      cpf: '99999999903',
      telefone: null,
      endereco: null,
      veiculo: { placa: 'DEM0A01', marca: 'Fiat', modelo: 'Argo', ano: 2022, cor: 'Prata' }
    })
  );

  return resultado;
}

criarContas()
  .then((contas) => {
    console.log('\nContas de demonstração:\n');
    for (const conta of contas) {
      console.log(`  ${conta.perfil.padEnd(14)} ${conta.email.padEnd(30)} ${conta.situacao}`);
    }

    if (contas.some((conta) => conta.situacao === 'criada')) {
      console.log(`\n  Senha das contas criadas: ${senha}`);
      console.log('  Guarde esta senha agora: ela não é mostrada de novo.\n');
    }
  })
  .catch((error) => {
    console.error(`✗ ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
