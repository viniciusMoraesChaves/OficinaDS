-- OficinaDS | Presença e não comparecimento em agendamentos
-- Execute como root, depois do 15 (agendamentos) e do 24 (cancelamento). Idempotente.
--   - novo status 'Não compareceu' no CHECK ck_agendamento_status
--   - presenca_registrada_em / presenca_registrada_por_usuario (auditoria)

SET NAMES utf8mb4;
USE oficina_ds;

-- Colunas de auditoria
SET @col := (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'agendamento'
               AND column_name = 'presenca_registrada_em');
SET @sql := IF(@col = 0,
  'ALTER TABLE agendamento ADD COLUMN presenca_registrada_em DATETIME NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'agendamento'
               AND column_name = 'presenca_registrada_por_usuario');
SET @sql := IF(@col = 0,
  'ALTER TABLE agendamento ADD COLUMN presenca_registrada_por_usuario INT UNSIGNED NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @fk := (SELECT COUNT(*) FROM information_schema.table_constraints
            WHERE table_schema = DATABASE() AND table_name = 'agendamento'
              AND constraint_name = 'fk_agendamento_presenca_usuario');
SET @sql := IF(@fk = 0,
  'ALTER TABLE agendamento ADD CONSTRAINT fk_agendamento_presenca_usuario FOREIGN KEY (presenca_registrada_por_usuario) REFERENCES usuario (id_usuario)',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- CHECK de status: recria só se ainda não aceita 'Não compareceu'
SET @tem := (SELECT COUNT(*) FROM information_schema.check_constraints
             WHERE constraint_schema = DATABASE() AND constraint_name = 'ck_agendamento_status');
SET @ok := (SELECT COUNT(*) FROM information_schema.check_constraints
            WHERE constraint_schema = DATABASE() AND constraint_name = 'ck_agendamento_status'
              AND check_clause LIKE '%compareceu%');
SET @sql := IF(@tem > 0 AND @ok = 0,
  'ALTER TABLE agendamento DROP CONSTRAINT ck_agendamento_status', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(@ok = 0,
  'ALTER TABLE agendamento ADD CONSTRAINT ck_agendamento_status CHECK (status IN (''Agendado'', ''Confirmado'', ''Em atendimento'', ''Concluído'', ''Cancelado'', ''Não compareceu''))',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

GRANT SELECT, INSERT, UPDATE ON oficina_ds.agendamento TO 'oficina_app'@'localhost';
FLUSH PRIVILEGES;
