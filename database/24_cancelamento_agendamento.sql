-- OficinaDS | DM-161 - Cancelar atendimento previamente agendado
-- Execute como root após 23_pecas_utilizadas.sql. Pode ser repetido.

USE oficina_ds;

SET @existe := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'oficina_ds'
    AND TABLE_NAME = 'agendamento'
    AND COLUMN_NAME = 'motivo_cancelamento'
);
SET @sql := IF(
  @existe = 0,
  'ALTER TABLE agendamento ADD COLUMN motivo_cancelamento VARCHAR(500) NULL AFTER reagendado_em',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'oficina_ds'
    AND TABLE_NAME = 'agendamento'
    AND COLUMN_NAME = 'cancelado_em'
);
SET @sql := IF(
  @existe = 0,
  'ALTER TABLE agendamento ADD COLUMN cancelado_em DATETIME NULL AFTER motivo_cancelamento',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'oficina_ds'
    AND TABLE_NAME = 'agendamento'
    AND COLUMN_NAME = 'cancelado_por_usuario'
);
SET @sql := IF(
  @existe = 0,
  'ALTER TABLE agendamento ADD COLUMN cancelado_por_usuario INT UNSIGNED NULL AFTER cancelado_em',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'oficina_ds'
    AND TABLE_NAME = 'agendamento'
    AND INDEX_NAME = 'idx_agendamento_cancelado_por'
);
SET @sql := IF(
  @existe = 0,
  'ALTER TABLE agendamento ADD INDEX idx_agendamento_cancelado_por (cancelado_por_usuario)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'oficina_ds'
    AND TABLE_NAME = 'agendamento'
    AND CONSTRAINT_NAME = 'fk_agendamento_cancelado_por'
);
SET @sql := IF(
  @existe = 0,
  'ALTER TABLE agendamento ADD CONSTRAINT fk_agendamento_cancelado_por FOREIGN KEY (cancelado_por_usuario) REFERENCES usuario (id_usuario)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

GRANT SELECT, UPDATE ON oficina_ds.agendamento TO 'oficina_app'@'localhost';

-- DM-36: consulta dos serviços atribuídos e edição/inativação da equipe.
GRANT SELECT ON oficina_ds.funcionario TO 'oficina_app'@'localhost';
GRANT UPDATE (nome, cpf, email, telefone, data_admissao, id_cargo, ativo)
  ON oficina_ds.funcionario TO 'oficina_app'@'localhost';
GRANT SELECT ON oficina_ds.usuario TO 'oficina_app'@'localhost';
GRANT UPDATE (email, id_perfil, ativo)
  ON oficina_ds.usuario TO 'oficina_app'@'localhost';
GRANT SELECT ON oficina_ds.cargo TO 'oficina_app'@'localhost';
GRANT SELECT ON oficina_ds.veiculo TO 'oficina_app'@'localhost';
GRANT SELECT ON oficina_ds.atendimento TO 'oficina_app'@'localhost';
GRANT SELECT ON oficina_ds.ordem_servico TO 'oficina_app'@'localhost';

FLUSH PRIVILEGES;
