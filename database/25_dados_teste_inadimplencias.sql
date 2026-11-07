-- OficinaDS | Dados fictícios para a consulta de inadimplências (opcional)
-- Cria cobranças de exemplo para os cinco primeiros clientes ativos, com
-- vencimentos relativos a hoje, para a tela mostrar vencidas, a vencer e pagas.
-- Execute conectado como root, após 24_inadimplencias.sql. Idempotente: se já
-- existir alguma cobrança de exemplo, nada é inserido de novo.
-- Para limpar: DELETE FROM cobranca WHERE descricao LIKE 'Exemplo: %';

USE oficina_ds;

INSERT INTO cobranca
  (id_cliente, id_veiculo, descricao, valor, data_vencimento, data_pagamento, status)
SELECT
  c.id_cliente,
  (SELECT MIN(v.id_veiculo) FROM veiculo v WHERE v.id_cliente = c.id_cliente),
  CONCAT('Exemplo: ', e.descricao),
  e.valor,
  DATE_ADD(CURDATE(), INTERVAL e.dias DAY),
  CASE WHEN e.situacao = 'pago' THEN DATE_ADD(CURDATE(), INTERVAL e.dias DAY) ELSE NULL END,
  e.situacao
FROM (
  SELECT id_cliente, ROW_NUMBER() OVER (ORDER BY id_cliente) AS ordem
  FROM cliente
  WHERE ativo = 1
) c
INNER JOIN (
  SELECT 1 AS ordem, 'Revisão completa' AS descricao, 480.00 AS valor, -75 AS dias, 'pendente' AS situacao
  UNION ALL SELECT 1, 'Troca de pastilhas de freio', 320.00, -20, 'pendente'
  UNION ALL SELECT 2, 'Alinhamento e balanceamento', 180.00, -45, 'pendente'
  UNION ALL SELECT 2, 'Troca de óleo e filtros', 260.00, -8, 'pendente'
  UNION ALL SELECT 3, 'Reparo da suspensão dianteira', 1250.00, -100, 'pendente'
  UNION ALL SELECT 3, 'Diagnóstico eletrônico', 90.00, 10, 'pendente'
  UNION ALL SELECT 4, 'Troca de bateria', 540.00, -3, 'pendente'
  UNION ALL SELECT 4, 'Revisão de 20 mil km', 410.00, -30, 'pago'
  UNION ALL SELECT 5, 'Troca de embreagem', 1890.00, -62, 'pendente'
) e
  ON e.ordem = c.ordem
WHERE NOT EXISTS (
  SELECT 1 FROM cobranca x WHERE x.descricao LIKE 'Exemplo: %'
);
