const { pool } = require('../config/database');

async function listarPecas() {
  const [linhas] = await pool.query(
    `SELECT
       id_peca,
       nome,
       quantidade,
       estoque_minimo,
       CASE
         WHEN estoque_minimo > 0 AND quantidade < estoque_minimo
           THEN 'ABAIXO'
         WHEN estoque_minimo > 0
           AND quantidade <= CEIL(estoque_minimo * 1.2)
           THEN 'PROXIMO'
         ELSE 'NORMAL'
       END AS situacao
     FROM peca
     WHERE ativo = TRUE
     ORDER BY nome ASC`
  );

  return linhas;
}

async function listarAlertas() {
  const [linhas] = await pool.query(
    `SELECT id_peca, nome, quantidade, estoque_minimo,
       CASE WHEN quantidade < estoque_minimo THEN 'ABAIXO' ELSE 'PROXIMO' END AS situacao
     FROM peca
     WHERE ativo = TRUE
       AND estoque_minimo > 0
       AND quantidade <= CEIL(estoque_minimo * 1.2)
     ORDER BY (quantidade - estoque_minimo) ASC`
  );

  return linhas;
}

module.exports = {listarPecas, listarAlertas};