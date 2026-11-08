-- OficinaDS | Lançamentos de exemplo para o controle financeiro (opcional)
-- Execute conectado como root, após 30_movimentacoes_financeiras.sql.
-- Idempotente: se já existir algum lançamento de exemplo, nada é inserido de novo.
-- Datas relativas a hoje, para a tela mostrar o mês atual e o anterior.
-- Para limpar: DELETE FROM movimentacao_financeira WHERE descricao LIKE 'Exemplo: %';

USE oficina_ds;

INSERT INTO movimentacao_financeira
  (tipo, categoria, descricao, valor, data_movimentacao, forma_pagamento)
SELECT e.tipo, e.categoria, CONCAT('Exemplo: ', e.descricao), e.valor,
       DATE_SUB(CURDATE(), INTERVAL e.dias DAY), e.forma
FROM (
  SELECT 'entrada' AS tipo, 'Serviços' AS categoria, 'Revisão completa' AS descricao, 480.00 AS valor, 2 AS dias, 'pix' AS forma
  UNION ALL SELECT 'entrada', 'Serviços', 'Troca de pastilhas de freio', 320.00, 5, 'cartao_debito'
  UNION ALL SELECT 'entrada', 'Venda de peças', 'Venda de bateria 60 Ah', 560.00, 9, 'dinheiro'
  UNION ALL SELECT 'entrada', 'Serviços', 'Alinhamento e balanceamento', 180.00, 14, 'pix'
  UNION ALL SELECT 'entrada', 'Serviços', 'Troca de embreagem', 1890.00, 38, 'cartao_credito'
  UNION ALL SELECT 'saida', 'Compra de peças', 'Reposição de filtros e óleo', 740.00, 4, 'boleto'
  UNION ALL SELECT 'saida', 'Água, luz e internet', 'Conta de energia', 390.00, 7, 'boleto'
  UNION ALL SELECT 'saida', 'Salários', 'Folha da equipe', 4200.00, 11, 'transferencia'
  UNION ALL SELECT 'saida', 'Aluguel', 'Aluguel do galpão', 2300.00, 12, 'transferencia'
  UNION ALL SELECT 'saida', 'Compra de peças', 'Pastilhas e discos de freio', 980.00, 36, 'pix'
  UNION ALL SELECT 'saida', 'Manutenção', 'Manutenção do elevador', 450.00, 41, 'dinheiro'
) e
WHERE NOT EXISTS (
  SELECT 1 FROM movimentacao_financeira x WHERE x.descricao LIKE 'Exemplo: %'
);
