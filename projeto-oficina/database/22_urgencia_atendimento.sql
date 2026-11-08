-- OficinaDS | DM-253 - Definir urgência do atendimento
-- Execute como root após 18_estoque_pecas.sql.

USE oficina_ds;

ALTER TABLE atendimento
  ADD COLUMN urgencia ENUM('baixa', 'media', 'alta')
  NOT NULL DEFAULT 'media' AFTER status;

CREATE INDEX idx_atendimento_urgencia
  ON atendimento (urgencia);

-- O script 10 já concede INSERT e UPDATE em atendimento.
FLUSH PRIVILEGES;
