-- OficinaDS | Histórico de atendimentos do veículo
-- Execute como root, após os scripts anteriores. Idempotente.
--
-- O histórico usa a tabela "atendimento" que já existe (script 09), os itens
-- dos orçamentos aceitos como serviços realizados e os diagnósticos registrados.
-- Só as peças utilizadas precisam de tabela própria.

USE oficina_ds;

CREATE TABLE IF NOT EXISTS peca_utilizada (
  id_peca_utilizada INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_atendimento INT UNSIGNED NOT NULL,
  nome_peca VARCHAR(150) NOT NULL,
  quantidade INT UNSIGNED NOT NULL DEFAULT 1,
  valor_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT ck_peca_quantidade CHECK (quantidade > 0),
  CONSTRAINT fk_peca_atendimento
    FOREIGN KEY (id_atendimento) REFERENCES atendimento (id_atendimento),
  INDEX idx_peca_atendimento (id_atendimento)
) ENGINE = InnoDB;

-- Acelera a consulta do histórico por veículo.
SET @existe := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'oficina_ds'
    AND TABLE_NAME = 'atendimento'
    AND INDEX_NAME = 'idx_atendimento_veiculo_criado'
);
SET @sql := IF(
  @existe = 0,
  'CREATE INDEX idx_atendimento_veiculo_criado ON atendimento (id_veiculo, criado_em)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
