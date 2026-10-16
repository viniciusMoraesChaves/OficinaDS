-- OficinaDS | Atendimentos realizados voltam a aparecer nos diagnósticos
-- Execute como root, após o 16. Idempotente.
--
-- Antes, remover um cliente da lista cancelava o atendimento mesmo quando o
-- orçamento tinha sido aceito. Agora esses atendimentos ficam "concluidos".

USE oficina_ds;

-- 1) Atendimentos cancelados que tiveram orçamento aceito eram, na verdade, realizados.
UPDATE atendimento a
SET a.status = 'concluido'
WHERE a.status = 'cancelado'
  AND EXISTS (
    SELECT 1 FROM orcamento o
    WHERE o.id_atendimento = a.id_atendimento AND o.status = 'aceito'
  );

-- 2) Reabre a ordem de serviço desses atendimentos.
UPDATE ordem_servico os
INNER JOIN atendimento a ON a.id_atendimento = os.id_atendimento
SET os.status = 'Aberta', os.data_fechamento = NULL
WHERE a.status = 'concluido' AND os.data_fechamento IS NOT NULL;

-- 3) Cria a ordem de serviço dos atendimentos abertos/concluídos que ainda não têm.
INSERT INTO ordem_servico
  (id_cliente, id_veiculo, id_funcionario, id_atendimento, status, descricao_problema, data_abertura)
SELECT a.id_cliente, a.id_veiculo, a.id_funcionario, a.id_atendimento,
       'Aberta', CONCAT('Atendimento #', a.id_atendimento), a.criado_em
FROM atendimento a
WHERE a.status IN ('aberto', 'concluido')
  AND NOT EXISTS (
    SELECT 1 FROM ordem_servico o WHERE o.id_atendimento = a.id_atendimento
  );
