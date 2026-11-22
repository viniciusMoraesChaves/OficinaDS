const diagnosticosRepository = require('../repositories/diagnosticosRepository');
const { parseId, ValidationError } = require('../utils/queryParams');

function parsePayload(body = {}) {
  const ordemId = parseId(body.ordemId);
  const funcionarioId = parseId(body.funcionarioId);
  const descricao = String(body.descricao || '').trim();

  if (descricao.length < 10) {
    throw new ValidationError('O diagnóstico deve ter pelo menos 10 caracteres.');
  }

  if (descricao.length > 2000) {
    throw new ValidationError('O diagnóstico deve ter no máximo 2000 caracteres.');
  }

  return { ordemId, funcionarioId, descricao };
}

async function validateRelations({ ordemId, funcionarioId }) {
  const [ordem, funcionario] = await Promise.all([
    diagnosticosRepository.findOrderById(ordemId),
    diagnosticosRepository.findEmployeeById(funcionarioId)
  ]);

  if (!ordem) {
    throw new ValidationError('A ordem de serviço informada não existe.');
  }

  if (!funcionario) {
    throw new ValidationError('Selecione um funcionário ativo.');
  }
}

async function list(req, res) {
  const diagnosticos = await diagnosticosRepository.findAll();
  res.json({ dados: diagnosticos });
}

async function options(req, res) {
  const data = await diagnosticosRepository.findOptions();
  res.json({ dados: data });
}

async function create(req, res) {
  const payload = parsePayload(req.body);
  await validateRelations(payload);

  const diagnostico = await diagnosticosRepository.create(payload);

  res.status(201).json({
    mensagem: 'Diagnóstico registrado com sucesso.',
    dados: diagnostico
  });
}

async function update(req, res) {
  const id = parseId(req.params.id);
  const payload = parsePayload(req.body);
  await validateRelations(payload);

  const diagnostico = await diagnosticosRepository.update(id, payload);

  if (!diagnostico) {
    return res.status(404).json({
      erro: 'DIAGNOSTICO_NAO_ENCONTRADO',
      mensagem: 'Diagnóstico não encontrado.'
    });
  }

  return res.json({
    mensagem: 'Diagnóstico atualizado com sucesso.',
    dados: diagnostico
  });
}

async function remove(req, res) {
  const id = parseId(req.params.id);
  const affectedRows = await diagnosticosRepository.remove(id);

  if (affectedRows === 0) {
    return res.status(404).json({
      erro: 'DIAGNOSTICO_NAO_ENCONTRADO',
      mensagem: 'Diagnóstico não encontrado.'
    });
  }

  return res.json({ mensagem: 'Diagnóstico excluído com sucesso.' });
}

module.exports = { list, options, create, update, remove, parsePayload };
