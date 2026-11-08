-- OficinaDS | Consultas de inadimplências para estudar e conferir no Workbench
-- Opcional e somente leitura: só tem SELECT. São as mesmas regras que a aplicação
-- usa em src/repositories/cobrancasRepository.js.
-- Rode depois do 24_inadimplencias.sql (e do 25, se quiser dados de exemplo).

USE oficina_ds;

-- Regra: inadimplente = cobrança pendente com vencimento anterior a hoje.
-- Quem vence hoje ainda está em dia.

-- 1) Resumo financeiro (cartões da tela).
SELECT
  COALESCE(SUM(CASE WHEN data_vencimento < CURDATE() THEN valor END), 0) AS valor_vencido,
  COUNT(CASE WHEN data_vencimento < CURDATE() THEN 1 END) AS cobrancas_vencidas,
  COUNT(DISTINCT CASE WHEN data_vencimento < CURDATE() THEN id_cliente END) AS clientes_inadimplentes,
  COALESCE(MAX(CASE WHEN data_vencimento < CURDATE()
                    THEN DATEDIFF(CURDATE(), data_vencimento) END), 0) AS maior_atraso_dias,
  COALESCE(SUM(CASE WHEN data_vencimento >= CURDATE() THEN valor END), 0) AS valor_a_vencer
FROM cobranca
WHERE status = 'pendente';

-- 2) Cobranças vencidas, com filtros opcionais. NULL significa "sem filtro".
SET @busca = NULL;         -- ex.: '%ricardo%'
SET @atraso_min = NULL;    -- ex.: 31  (dias)
SET @atraso_max = NULL;    -- ex.: 60  (dias)
SET @valor_min = NULL;     -- ex.: 100
SET @valor_max = NULL;     -- ex.: 1500
SET @venc_de = NULL;       -- ex.: '2026-01-01'
SET @venc_ate = NULL;      -- ex.: '2026-12-31'

SELECT
  c.id_cobranca,
  cl.nome AS cliente,
  cl.cpf,
  v.placa,
  c.descricao,
  c.valor,
  c.data_vencimento,
  DATEDIFF(CURDATE(), c.data_vencimento) AS dias_atraso
FROM cobranca c
INNER JOIN cliente cl ON cl.id_cliente = c.id_cliente
LEFT JOIN veiculo v ON v.id_veiculo = c.id_veiculo
WHERE c.status = 'pendente'
  AND c.data_vencimento < CURDATE()
  AND (@busca IS NULL OR cl.nome LIKE @busca OR cl.cpf LIKE @busca OR v.placa LIKE @busca)
  AND (@atraso_min IS NULL OR DATEDIFF(CURDATE(), c.data_vencimento) >= @atraso_min)
  AND (@atraso_max IS NULL OR DATEDIFF(CURDATE(), c.data_vencimento) <= @atraso_max)
  AND (@valor_min IS NULL OR c.valor >= @valor_min)
  AND (@valor_max IS NULL OR c.valor <= @valor_max)
  AND (@venc_de IS NULL OR c.data_vencimento >= @venc_de)
  AND (@venc_ate IS NULL OR c.data_vencimento <= @venc_ate)
ORDER BY c.data_vencimento ASC, c.id_cobranca ASC;  -- maior atraso primeiro

-- 3) Clientes com valores em aberto (total devido por cliente).
SELECT
  cl.id_cliente,
  cl.nome,
  cl.cpf,
  COUNT(*) AS cobrancas_vencidas,
  SUM(c.valor) AS valor_em_aberto,
  MIN(c.data_vencimento) AS vencimento_mais_antigo,
  MAX(DATEDIFF(CURDATE(), c.data_vencimento)) AS maior_atraso_dias
FROM cobranca c
INNER JOIN cliente cl ON cl.id_cliente = c.id_cliente
WHERE c.status = 'pendente'
  AND c.data_vencimento < CURDATE()
GROUP BY cl.id_cliente, cl.nome, cl.cpf
ORDER BY valor_em_aberto DESC, cl.nome ASC;

-- 4) Conferência: orçamentos aceitos que ficaram sem cobrança (o resultado deve ser vazio).
SELECT o.id_orcamento, o.valor_total, o.decidido_em
FROM orcamento o
WHERE o.status = 'aceito'
  AND o.valor_total > 0
  AND NOT EXISTS (SELECT 1 FROM cobranca c WHERE c.id_orcamento = o.id_orcamento);

-- 5) Distribuição por faixa de atraso (mesmas faixas do filtro da tela).
SELECT
  CASE
    WHEN DATEDIFF(CURDATE(), data_vencimento) <= 30 THEN 'Até 30 dias'
    WHEN DATEDIFF(CURDATE(), data_vencimento) <= 60 THEN '31 a 60 dias'
    WHEN DATEDIFF(CURDATE(), data_vencimento) <= 90 THEN '61 a 90 dias'
    ELSE 'Mais de 90 dias'
  END AS faixa,
  COUNT(*) AS cobrancas,
  SUM(valor) AS valor
FROM cobranca
WHERE status = 'pendente'
  AND data_vencimento < CURDATE()
GROUP BY faixa
ORDER BY MIN(DATEDIFF(CURDATE(), data_vencimento));
