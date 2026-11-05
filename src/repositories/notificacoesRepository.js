const { pool } = require('../config/database');

const DIAS_ORCAMENTO_PARADO = 3;
const DIAS_ATENDIMENTO_PARADO = 7;

async function resumoOrcamentosAguardando() {
  const [linhas] = await pool.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(DATEDIFF(NOW(), COALESCE(enviado_em, criado_em)) >= ?), 0) AS parados
     FROM orcamento
     WHERE status = 'enviado'`,
    [DIAS_ORCAMENTO_PARADO]
  );

  return {
    total: Number(linhas[0].total),
    parados: Number(linhas[0].parados),
    dias: DIAS_ORCAMENTO_PARADO
  };
}

async function resumoAtendimentosParados() {
  const [linhas] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM atendimento
     WHERE status = 'aberto'
       AND DATEDIFF(NOW(), criado_em) >= ?`,
    [DIAS_ATENDIMENTO_PARADO]
  );

  return {
    total: Number(linhas[0].total),
    dias: DIAS_ATENDIMENTO_PARADO
  };
}

module.exports = { resumoOrcamentosAguardando, resumoAtendimentosParados };