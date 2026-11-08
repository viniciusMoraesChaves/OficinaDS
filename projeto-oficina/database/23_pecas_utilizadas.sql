-- OficinaDS | DM-199 - Registrar peças utilizadas no atendimento
-- Execute como root após 22_urgencia_atendimento.sql. Idempotente.

USE oficina_ds;

-- A tabela histórica já existe desde o script 16. Estas colunas ligam cada
-- utilização à peça real do estoque e à ordem de serviço do atendimento.
SET @existe := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'oficina_ds'
    AND TABLE_NAME = 'peca_utilizada'
    AND COLUMN_NAME = 'id_peca'
);
SET @sql := IF(
  @existe = 0,
  'ALTER TABLE peca_utilizada ADD COLUMN id_peca INT UNSIGNED NULL AFTER id_atendimento',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'oficina_ds'
    AND TABLE_NAME = 'peca_utilizada'
    AND COLUMN_NAME = 'id_ordem'
);
SET @sql := IF(
  @existe = 0,
  'ALTER TABLE peca_utilizada ADD COLUMN id_ordem INT UNSIGNED NULL AFTER id_atendimento',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'oficina_ds'
    AND TABLE_NAME = 'peca_utilizada'
    AND COLUMN_NAME = 'criado_em'
);
SET @sql := IF(
  @existe = 0,
  'ALTER TABLE peca_utilizada ADD COLUMN criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'oficina_ds'
    AND TABLE_NAME = 'peca_utilizada'
    AND COLUMN_NAME = 'atualizado_em'
);
SET @sql := IF(
  @existe = 0,
  'ALTER TABLE peca_utilizada ADD COLUMN atualizado_em DATETIME NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'oficina_ds'
    AND TABLE_NAME = 'peca_utilizada'
    AND INDEX_NAME = 'idx_peca_utilizada_peca'
);
SET @sql := IF(
  @existe = 0,
  'ALTER TABLE peca_utilizada ADD INDEX idx_peca_utilizada_peca (id_peca)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'oficina_ds'
    AND TABLE_NAME = 'peca_utilizada'
    AND INDEX_NAME = 'idx_peca_utilizada_ordem'
);
SET @sql := IF(
  @existe = 0,
  'ALTER TABLE peca_utilizada ADD INDEX idx_peca_utilizada_ordem (id_ordem)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'oficina_ds'
    AND TABLE_NAME = 'peca_utilizada'
    AND CONSTRAINT_NAME = 'fk_peca_utilizada_peca'
);
SET @sql := IF(
  @existe = 0,
  'ALTER TABLE peca_utilizada ADD CONSTRAINT fk_peca_utilizada_peca FOREIGN KEY (id_peca) REFERENCES peca (id_peca)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'oficina_ds'
    AND TABLE_NAME = 'peca_utilizada'
    AND CONSTRAINT_NAME = 'fk_peca_utilizada_ordem'
);
SET @sql := IF(
  @existe = 0,
  'ALTER TABLE peca_utilizada ADD CONSTRAINT fk_peca_utilizada_ordem FOREIGN KEY (id_ordem) REFERENCES ordem_servico (id_ordem)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

GRANT UPDATE ON oficina_ds.peca TO 'oficina_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON oficina_ds.peca_utilizada TO 'oficina_app'@'localhost';

FLUSH PRIVILEGES;
