-- DM-11 - Acompanhar status dos serviços
-- Executar após o script 14.
USE oficina_ds;

-- Adiciona a previsão apenas se ainda não existir.
SET @existe := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'oficina_ds'
    AND TABLE_NAME = 'ordem_servico'
    AND COLUMN_NAME = 'previsao_conclusao'
);

SET @sql := IF(
  @existe = 0,
  'ALTER TABLE ordem_servico ADD COLUMN previsao_conclusao DATETIME NULL',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Permissões utilizadas para consultar e atualizar o progresso.
GRANT SELECT, UPDATE ON oficina_ds.ordem_servico
TO 'oficina_app'@'localhost';
