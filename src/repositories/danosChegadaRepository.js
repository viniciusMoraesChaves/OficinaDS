const { pool } = require('../config/database');

async function buscarAtendimento(idAtendimento) {
  const [rows] = await pool.execute(
    `SELECT id_atendimento AS id, id_veiculo AS idVeiculo, status
     FROM atendimento
     WHERE id_atendimento = ?`,
    [idAtendimento]
  );
  return rows[0] || null;
}

async function buscarFuncionarioDoUsuario(idUsuario) {
  const [rows] = await pool.execute(
    `SELECT id_funcionario AS id
     FROM funcionario
     WHERE id_usuario = ? AND ativo = 1
     LIMIT 1`,
    [idUsuario]
  );
  return rows[0] || null;
}

async function listar(idAtendimento) {
  const [rows] = await pool.execute(
    `SELECT
       d.id_dano AS id,
       d.id_atendimento AS atendimentoId,
       a.id_veiculo AS veiculoId,
       d.descricao,
       d.registrado_em AS registradoEm,
       u.id_usuario AS usuarioId,
       COALESCE(f.nome, NULLIF(u.nome, ''), u.email) AS registradoPor
     FROM dano_chegada d
     INNER JOIN atendimento a ON a.id_atendimento = d.id_atendimento
     INNER JOIN usuario u ON u.id_usuario = d.id_usuario_registro
     LEFT JOIN funcionario f ON f.id_usuario = u.id_usuario
     WHERE d.id_atendimento = ?
     ORDER BY d.registrado_em DESC, d.id_dano DESC`,
    [idAtendimento]
  );
  return rows;
}

async function registrar(idAtendimento, idUsuario, descricao) {
  // A condicao de atendimento aberto faz parte do INSERT para evitar
  // registrar um dano apos outra requisicao encerrar o atendimento.
  const [result] = await pool.execute(
    `INSERT INTO dano_chegada (id_atendimento, id_usuario_registro, descricao)
     SELECT a.id_atendimento, ?, ?
     FROM atendimento a
     WHERE a.id_atendimento = ? AND a.status = 'aberto'`,
    [idUsuario, descricao, idAtendimento]
  );
  return result.affectedRows > 0 ? result.insertId : null;
}

module.exports = { buscarAtendimento, buscarFuncionarioDoUsuario, listar, registrar };
