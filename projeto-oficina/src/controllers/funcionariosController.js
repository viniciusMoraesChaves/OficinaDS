const bcrypt = require('bcryptjs');
const funcionariosRepository = require('../repositories/funcionariosRepository');
const {
  parsePagination,
  parseEmployeeFilters,
  buildPagination
} = require('../utils/queryParams');
const cargosRepository = require('../repositories/cargosRepository');
const perfisRepository = require('../repositories/perfisRepository');
const contasRepository = require('../repositories/contasRepository');
const { PERFIS } = require('../utils/perfis');
const { exigirTexto, exigirCpf, exigirEmail, exigirSenha } = require('../utils/validacoes');

const SALT_ROUNDS = 10;

async function search(req, res) {
  const pagination = parsePagination(req.query);
  const filters = parseEmployeeFilters(req.query);
  const result = await funcionariosRepository.search({
    ...pagination,
    ...filters
  });

  res.json({
    dados: result.rows,
    filtros: filters,
    paginacao: buildPagination(
      pagination.pagina,
      pagination.limite,
      result.total
    )
  });
}

async function listarOpcoes(req, res) {
  const funcionarios = await funcionariosRepository.listarAtivos();
  res.json({ dados: funcionarios });
}

async function updateCargo(req, res) {
  const idFuncionario = Number(req.params.id);
  const idCargo = Number(req.body.idCargo);

  if (!Number.isInteger(idFuncionario) || idFuncionario <= 0) {
    return res.status(400).json({
      mensagem: 'Funcionário inválido.'
    });
  }

  if (!Number.isInteger(idCargo) || idCargo <= 0) {
    return res.status(400).json({
      mensagem: 'Cargo inválido.'
    });
  }

  const cargo = await cargosRepository.findById(idCargo);

  if (!cargo) {
    return res.status(404).json({
      mensagem: 'Cargo não encontrado.'
    });
  }

  const nomePerfil =
    cargo.nome === 'Gerente'
      ? PERFIS.ADMINISTRADOR
      : PERFIS.FUNCIONARIO;

  const perfil = await perfisRepository.buscarPorNome(nomePerfil);

  if (!perfil) {
    return res.status(500).json({
      mensagem: 'Perfil correspondente ao cargo não encontrado.'
    });
  }

  const affectedRows = await funcionariosRepository.updateCargoEPerfil(
    idFuncionario,
    idCargo,
    perfil.id
  );

  if (affectedRows === 0) {
    return res.status(404).json({
      mensagem: 'Funcionário não encontrado.'
    });
  }

  res.json({
    mensagem: 'Cargo atualizado com sucesso.'
  });
}

async function criar(req, res) {
  const { nome, cpf, email, telefone, dataAdmissao, idCargo, senha } = req.body;

  const nomeLimpo = exigirTexto(nome, 'Informe o nome do funcionário.');
  const cpfDigits = exigirCpf(cpf);
  const emailLimpo = exigirEmail(email);
  exigirSenha(senha);

  if (!dataAdmissao) {
    return res.status(400).json({ mensagem: 'Informe a data de admissão.' });
  }

  const idCargoNum = Number(idCargo);
  if (!Number.isInteger(idCargoNum) || idCargoNum <= 0) {
    return res.status(400).json({ mensagem: 'Selecione um cargo.' });
  }

  const cargo = await cargosRepository.findById(idCargoNum);
  if (!cargo) {
    return res.status(404).json({ mensagem: 'Cargo não encontrado.' });
  }

  const nomePerfil = cargo.nome === 'Gerente' ? PERFIS.ADMINISTRADOR : PERFIS.FUNCIONARIO;
  const perfil = await perfisRepository.buscarPorNome(nomePerfil);

  if (!perfil) {
    return res.status(500).json({ mensagem: 'Perfil correspondente ao cargo não encontrado.' });
  }

  const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

  // usuario + funcionario são gravados juntos (transação): ou os dois, ou nenhum.
  const funcionario = await contasRepository.criarContaFuncionario({
    email: emailLimpo,
    senhaHash,
    idPerfil: perfil.id,
    nome: nomeLimpo,
    cpf: cpfDigits,
    telefone: telefone ? String(telefone).trim() : null,
    dataAdmissao,
    idCargo: idCargoNum
  });

  const posicao = await funcionariosRepository.posicaoNaLista(funcionario.id);

  res.status(201).json({
    dados: { ...funcionario, cargo: cargo.nome, perfil: nomePerfil },
    posicao,
    mensagem: 'Funcionário cadastrado com sucesso.'
  });
}

module.exports = { search, listarOpcoes, updateCargo, criar };
