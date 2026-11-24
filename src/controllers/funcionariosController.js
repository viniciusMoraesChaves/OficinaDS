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
const { parseId } = require('../utils/queryParams');

const SALT_ROUNDS = 10;

const PESO_DIFICULDADE = {
  baixa: 1.0,
  media: 1.5,
  alta: 2.0
};

const TEMPO_BASE_DIFICULDADE = {
  baixa: 45,
  media: 90,
  alta: 180
};

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

async function obter(req, res) {
  const id = parseId(req.params.id);
  const funcionario = await funcionariosRepository.findById(id);

  if (!funcionario) {
    return res.status(404).json({ mensagem: 'Funcionário não encontrado.' });
  }

  const servicos = await funcionariosRepository.listarServicosAtribuidos(id);
  return res.json({ dados: { ...funcionario, servicos } });
}

function validarDataAdmissao(valor) {
  const data = String(valor || '').trim();
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);

  if (!partes) {
    const erro = new Error('Informe uma data de admissão válida.');
    erro.statusCode = 400;
    throw erro;
  }

  const conferida = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  if (
    conferida.getFullYear() !== Number(partes[1]) ||
    conferida.getMonth() !== Number(partes[2]) - 1 ||
    conferida.getDate() !== Number(partes[3])
  ) {
    const erro = new Error('Informe uma data de admissão válida.');
    erro.statusCode = 400;
    throw erro;
  }

  return data;
}

async function atualizar(req, res) {
  const id = parseId(req.params.id);
  const nome = exigirTexto(req.body.nome, 'Informe o nome do funcionário.');
  const cpf = exigirCpf(req.body.cpf);
  const email = exigirEmail(req.body.email);
  const telefone = String(req.body.telefone || '').trim() || null;
  const dataAdmissao = validarDataAdmissao(req.body.dataAdmissao);
  const idCargo = Number(req.body.idCargo);
  const ativo = req.body.ativo;

  if (telefone && telefone.length > 20) {
    return res.status(400).json({ mensagem: 'O telefone deve ter no máximo 20 caracteres.' });
  }

  if (!Number.isInteger(idCargo) || idCargo <= 0) {
    return res.status(400).json({ mensagem: 'Selecione um cargo.' });
  }

  if (typeof ativo !== 'boolean') {
    return res.status(400).json({ mensagem: 'Informe a situação do funcionário.' });
  }

  const cargo = await cargosRepository.findById(idCargo);
  if (!cargo) {
    return res.status(404).json({ mensagem: 'Cargo não encontrado.' });
  }

  const nomePerfil = cargo.nome === 'Gerente' ? PERFIS.ADMINISTRADOR : PERFIS.FUNCIONARIO;
  const perfil = await perfisRepository.buscarPorNome(nomePerfil);

  if (!perfil) {
    return res.status(500).json({ mensagem: 'Perfil correspondente ao cargo não encontrado.' });
  }

  const atualizado = await funcionariosRepository.atualizar({
    idFuncionario: id,
    nome,
    cpf,
    email,
    telefone,
    dataAdmissao,
    idCargo,
    idPerfil: perfil.id,
    ativo
  });

  if (!atualizado) {
    return res.status(404).json({ mensagem: 'Funcionário não encontrado.' });
  }

  return res.json({
    mensagem: ativo
      ? 'Funcionário atualizado e mantido ativo.'
      : 'Funcionário atualizado e inativado.'
  });
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

function normalizarDificuldade(valor) {
  const texto = String(valor || 'media')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (texto === 'baixa' || texto === 'alta' || texto === 'media') {
    return texto;
  }
  return 'media';
}

function validarDataRelatorio(valor) {
  if (!valor) {
    return new Date().toISOString().split('T')[0];
  }

  const data = String(valor).trim();
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);

  if (!partes) {
    const erro = new Error('Informe uma data válida no formato AAAA-MM-DD.');
    erro.statusCode = 400;
    throw erro;
  }

  return data;
}

function calcularDesempenho(servicos) {
  if (!servicos || servicos.length === 0) {
    return {
      totalServicos: 0,
      tempoTotalMinutos: 0,
      tempoMedioMinutos: 0,
      distribuicaoDificuldade: { baixa: 0, media: 0, alta: 0 },
      pontuacaoBruta: 0,
      indiceDesempenho: 0
    };
  }

  let tempoTotalMinutos = 0;
  let somaEficienciaPonderada = 0;
  let somaPesos = 0;
  const distribuicaoDificuldade = { baixa: 0, media: 0, alta: 0 };

  for (const s of servicos) {
    const dificuldade = normalizarDificuldade(s.dificuldade);
    const peso = PESO_DIFICULDADE[dificuldade];
    const tempoReferencia = TEMPO_BASE_DIFICULDADE[dificuldade];
    const tempoReal = Math.max(Number(s.tempoExecucaoMinutos) || 1, 1);

    distribuicaoDificuldade[dificuldade] += 1;
    tempoTotalMinutos += tempoReal;

    const razaoTempo = Math.min(Math.max(tempoReferencia / tempoReal, 0.5), 1.5);
    somaEficienciaPonderada += razaoTempo * peso;
    somaPesos += peso;
  }

  const mediaEficiencia = somaPesos > 0 ? somaEficienciaPonderada / somaPesos : 0;
  const indiceDesempenho = Math.min(Math.round(mediaEficiencia * 75), 100);

  return {
    totalServicos: servicos.length,
    tempoTotalMinutos,
    tempoMedioMinutos: Math.round(tempoTotalMinutos / servicos.length),
    distribuicaoDificuldade,
    pontuacaoBruta: Number(somaEficienciaPonderada.toFixed(2)),
    indiceDesempenho
  };
}

async function relatorioDiario(req, res) {
  const data = validarDataRelatorio(req.query.data);
  const idFuncionario = req.query.idFuncionario ? parseId(req.query.idFuncionario) : null;

  const [registros, historicoSemanal] = await Promise.all([
    funcionariosRepository.buscarDesempenhoPorDia(data, idFuncionario),
    funcionariosRepository.buscarHistoricoSemanalDesempenho(data, idFuncionario)
  ]);

  const mapaFuncionarios = new Map();

  for (const row of registros) {
    if (!mapaFuncionarios.has(row.idFuncionario)) {
      mapaFuncionarios.set(row.idFuncionario, {
        id: row.idFuncionario,
        nome: row.funcionarioNome,
        cargo: row.cargo,
        servicos: []
      });
    }

    if (row.idAtendimento) {
      mapaFuncionarios.get(row.idFuncionario).servicos.push({
        idAtendimento: row.idAtendimento,
        servico: row.servico,
        tempoExecucaoMinutos: Number(row.tempoExecucaoMinutos || 0),
        dificuldade: normalizarDificuldade(row.dificuldadeDiagnostico),
        criadoEm: row.criadoEm,
        finalizadoEm: row.finalizadoEm
      });
    }
  }

  const funcionarios = Array.from(mapaFuncionarios.values())
    .map((func) => ({
      ...func,
      ...calcularDesempenho(func.servicos)
    }))
    .sort((a, b) => b.indiceDesempenho - a.indiceDesempenho || a.nome.localeCompare(b.nome));

  const totalServicosDia = funcionarios.reduce((acc, f) => acc + f.totalServicos, 0);
  const ativosNoDia = funcionarios.filter((f) => f.totalServicos > 0);
  const mediaDesempenhoEquipe =
    ativosNoDia.length > 0
      ? Math.round(ativosNoDia.reduce((acc, f) => acc + f.indiceDesempenho, 0) / ativosNoDia.length)
      : 0;

  return res.json({
    dados: {
      dataReferencia: data,
      resumoGeral: {
        totalServicosDia,
        mediaDesempenhoEquipe
      },
      funcionarios,
      graficoSemanal: historicoSemanal.map((h) => ({
        dia: h.dia,
        totalServicos: Number(h.totalServicos),
        tempoMedioMinutos: Number(h.tempoMedioMinutos)
      }))
    }
  });
}

module.exports = { search, listarOpcoes, obter, atualizar, updateCargo, criar, relatorioDiario };