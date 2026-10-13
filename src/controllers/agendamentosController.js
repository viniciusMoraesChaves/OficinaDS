const agendamentosRepository = require('../repositories/agendamentosRepository');
const regras = require('../utils/regrasAgendamento');
const { parseId, ValidationError } = require('../utils/queryParams');

// Relógio isolado em um objeto para os testes poderem fixar "agora".
const relogio = { agora: () => new Date() };

function parseDataHora(body = {}) {
  const data = String(body.data ?? '').trim();
  const hora = String(body.hora ?? '').trim();

  regras.parseData(data);
  regras.parseHora(hora);

  return { data, hora };
}

function parseNovoAgendamento(body = {}) {
  const veiculoId = parseId(body.veiculoId);
  const funcionarioId = parseId(body.funcionarioId);
  const servico = String(body.servico || '').trim();

  if (servico.length < 3) {
    throw new ValidationError('Informe o serviço com pelo menos 3 caracteres.');
  }

  if (servico.length > 150) {
    throw new ValidationError('O serviço deve ter no máximo 150 caracteres.');
  }

  return { veiculoId, funcionarioId, servico, ...parseDataHora(body) };
}

function comRegraDeReagendamento(agendamento, agora) {
  return { ...agendamento, reagendamento: regras.avaliarReagendamento(agendamento, agora) };
}

function naoEncontrado(res) {
  return res.status(404).json({
    erro: 'AGENDAMENTO_NAO_ENCONTRADO',
    mensagem: 'Agendamento não encontrado.'
  });
}

async function list(req, res) {
  const agora = relogio.agora();
  const agendamentos = await agendamentosRepository.findAll();

  res.json({ dados: agendamentos.map((item) => comRegraDeReagendamento(item, agora)) });
}

async function options(req, res) {
  const dados = await agendamentosRepository.findOptions();
  res.json({ dados: { ...dados, regras: regras.regrasPublicas() } });
}

// Horários livres para um NOVO agendamento (precisa saber profissional e veículo).
async function horariosNovo(req, res) {
  const data = String(req.query.data ?? '').trim();
  regras.parseData(data);

  const funcionarioId = parseId(req.query.funcionarioId);
  const veiculoId = parseId(req.query.veiculoId);

  const ocupados = await agendamentosRepository.findOccupiedByDay(data);

  res.json({
    dados: regras.listarHorarios({
      data,
      ocupados,
      funcionarioId,
      veiculoId,
      agora: relogio.agora()
    })
  });
}

// Horários livres para REAGENDAR um agendamento existente (ele mesmo não
// conta como conflito).
async function horariosReagendamento(req, res) {
  const id = parseId(req.params.id);
  const data = String(req.query.data ?? '').trim();
  regras.parseData(data);

  const agora = relogio.agora();
  const atual = await agendamentosRepository.findById(id);

  if (!atual) {
    return naoEncontrado(res);
  }

  regras.exigirPodeReagendar(atual, agora);

  const ocupados = await agendamentosRepository.findOccupiedByDay(data);

  return res.json({
    dados: regras.listarHorarios({
      data,
      ocupados,
      funcionarioId: atual.funcionarioId,
      veiculoId: atual.veiculoId,
      ignorarId: id,
      inicioAtual: regras.parseInicioBanco(atual.dataHora),
      agora
    })
  });
}

async function create(req, res) {
  const payload = parseNovoAgendamento(req.body);
  const agora = relogio.agora();

  const [veiculo, funcionario] = await Promise.all([
    agendamentosRepository.findVehicleById(payload.veiculoId),
    agendamentosRepository.findEmployeeById(payload.funcionarioId)
  ]);

  if (!veiculo) {
    throw new ValidationError('Selecione um veículo de um cliente ativo.');
  }

  if (!funcionario) {
    throw new ValidationError('Selecione um funcionário ativo.');
  }

  const inicio = regras.montarInicio(payload.data, payload.hora);
  regras.exigirNovoInicioValido(inicio, agora);

  const criado = await agendamentosRepository.createSeLivre(
    {
      clienteId: veiculo.clienteId,
      veiculoId: payload.veiculoId,
      funcionarioId: payload.funcionarioId,
      servico: payload.servico,
      inicioSql: regras.formatarDataHoraSql(inicio)
    },
    (ocupados) =>
      regras.exigirSemConflito(
        { inicio, funcionarioId: payload.funcionarioId, veiculoId: payload.veiculoId },
        ocupados
      )
  );

  res.status(201).json({
    mensagem: 'Agendamento criado com sucesso.',
    dados: comRegraDeReagendamento(criado, agora)
  });
}

async function reagendar(req, res) {
  const id = parseId(req.params.id);
  const { data, hora } = parseDataHora(req.body);
  const agora = relogio.agora();

  const atual = await agendamentosRepository.findById(id);

  if (!atual) {
    return naoEncontrado(res);
  }

  // 1. status permitido e antecedência mínima
  regras.exigirPodeReagendar(atual, agora);

  // 2. novo horário dentro do expediente, com antecedência e na janela máxima
  const novoInicio = regras.montarInicio(data, hora);
  regras.exigirNovoInicioValido(novoInicio, agora);

  if (novoInicio.getTime() === regras.parseInicioBanco(atual.dataHora).getTime()) {
    throw new ValidationError('Escolha uma data ou um horário diferente do atual.');
  }

  // 3. conflitos de horário (conferidos de novo dentro da transação)
  const atualizado = await agendamentosRepository.reagendarSeLivre(
    id,
    regras.formatarDataHoraSql(novoInicio),
    (bloqueado, ocupados) => {
      regras.exigirPodeReagendar(bloqueado, agora);
      regras.exigirSemConflito(
        {
          inicio: novoInicio,
          duracaoMinutos: bloqueado.duracaoMinutos,
          funcionarioId: bloqueado.funcionarioId,
          veiculoId: bloqueado.veiculoId,
          ignorarId: id
        },
        ocupados
      );
    }
  );

  if (!atualizado) {
    return naoEncontrado(res);
  }

  return res.json({
    mensagem: 'Agendamento reagendado com sucesso.',
    dados: comRegraDeReagendamento(atualizado, agora)
  });
}

module.exports = {
  list,
  options,
  horariosNovo,
  horariosReagendamento,
  create,
  reagendar,
  parseNovoAgendamento,
  parseDataHora,
  relogio
};
