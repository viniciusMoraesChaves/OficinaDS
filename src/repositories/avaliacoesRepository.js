const { pool } = require('../config/database');
const { atendimentoConcluido } = require('../utils/avaliacoes');
const { ConflitoError } = require('../utils/erros');

// Dados que a regra de negócio precisa para decidir se o atendimento pode ser avaliado.
async function buscarAtendimento(idAtendimento) {
  const [rows] = await pool.execute(
    `SELECT
       a.id_atendimento AS id,
       a.id_cliente AS idCliente,
       a.id_funcionario AS idFuncionario,
       a.status,
       os.status AS etapaAtual,
       av.nota
     FROM atendimento a
     LEFT JOIN ordem_servico os ON os.id_atendimento = a.id_atendimento
     LEFT JOIN avaliacao_funcionario av ON av.id_atendimento = a.id_atendimento
     WHERE a.id_atendimento = ?`,
    [idAtendimento]
  );

  return rows[0] || null;
}

// O funcionário vem do atendimento (nunca do que o navegador mandou).
// A restrição UNIQUE do banco garante uma avaliação por atendimento, mesmo se
// duas requisições chegarem ao mesmo tempo.
async function registrar({ idAtendimento, idFuncionario, idCliente, nota }) {
  try {
    const [resultado] = await pool.execute(
      `INSERT INTO avaliacao_funcionario
         (id_atendimento, id_funcionario, id_cliente, nota)
       VALUES (?, ?, ?, ?)`,
      [idAtendimento, idFuncionario, idCliente, nota]
    );

    return resultado.insertId;
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new ConflitoError('Este atendimento já foi avaliado.');
    }

    throw error;
  }
}

// Atendimentos do cliente que já podem ser avaliados (ou que já foram), com a nota dada.
// Os ainda pendentes aparecem primeiro. A regra "concluído" é a mesma da hora de registrar.
async function listarDoCliente(idCliente) {
  const [rows] = await pool.execute(
    `SELECT
       a.id_atendimento AS id,
       a.criado_em AS criadoEm,
       a.status,
       os.status AS etapaAtual,
       f.id_funcionario AS idFuncionario,
       f.nome AS funcionarioNome,
       v.placa,
       v.marca,
       v.modelo,
       av.nota,
       av.criado_em AS avaliadoEm
     FROM atendimento a
     INNER JOIN funcionario f ON f.id_funcionario = a.id_funcionario
     INNER JOIN veiculo v ON v.id_veiculo = a.id_veiculo
     LEFT JOIN ordem_servico os ON os.id_atendimento = a.id_atendimento
     LEFT JOIN avaliacao_funcionario av ON av.id_atendimento = a.id_atendimento
     WHERE a.id_cliente = ?
       AND a.status <> 'cancelado'
     ORDER BY (av.id_avaliacao IS NULL) DESC, a.criado_em DESC, a.id_atendimento DESC`,
    [idCliente]
  );

  return rows
    .filter(atendimentoConcluido)
    .map(({ status, etapaAtual, ...atendimento }) => atendimento);
}

module.exports = {
  buscarAtendimento,
  registrar,
  listarDoCliente
};
