-- OficinaDS | Liga diagnósticos aos atendimentos em andamento
-- Execute como root, após o 13_diagnosticos.sql. Idempotente.
-- Cada atendimento passa a ter uma ordem de serviço (criada pela aplicação),
-- e é nela que os diagnósticos são registrados.

USE oficina_ds;

SET @existe := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'oficina_ds'
    AND TABLE_NAME = 'ordem_servico'
    AND COLUMN_NAME = 'id_atendimento'
);

SET @sql := IF(
  @existe = 0,
  'ALTER TABLE ordem_servico
     ADD COLUMN id_atendimento INT UNSIGNED NULL,
     ADD UNIQUE KEY uq_ordem_atendimento (id_atendimento),
     ADD CONSTRAINT fk_ordem_atendimento
       FOREIGN KEY (id_atendimento) REFERENCES atendimento (id_atendimento)',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Atendimento sem funcionário vinculado (ex.: Administrador) também gera ordem.
ALTER TABLE ordem_servico MODIFY id_funcionario INT UNSIGNED NULL;

-- Atendimentos abertos antes desta mudança ganham a sua ordem de serviço.
INSERT INTO ordem_servico
  (id_cliente, id_veiculo, id_funcionario, id_atendimento, status, descricao_problema, data_abertura)
SELECT a.id_cliente, a.id_veiculo, a.id_funcionario, a.id_atendimento,
       'Aberta', CONCAT('Atendimento #', a.id_atendimento), a.criado_em
FROM atendimento a
WHERE a.status = 'aberto'
  AND NOT EXISTS (
    SELECT 1 FROM ordem_servico o WHERE o.id_atendimento = a.id_atendimento
  );

GRANT SELECT, INSERT, UPDATE ON oficina_ds.ordem_servico TO 'oficina_app'@'localhost';
FLUSH PRIVILEGES;
