-- OficinaDS | Avaliar funcionários
-- Avaliação (de 1 a 5 estrelas) que o cliente dá ao funcionário responsável por
-- um atendimento. Cada atendimento recebe no máximo uma avaliação.
-- Execute conectado como root, após 24_cancelamento_agendamento.sql. Idempotente.

USE oficina_ds;

CREATE TABLE IF NOT EXISTS avaliacao_funcionario (
  id_avaliacao INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_atendimento INT UNSIGNED NOT NULL,
  id_funcionario INT UNSIGNED NOT NULL,
  id_cliente INT UNSIGNED NOT NULL,
  nota TINYINT UNSIGNED NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_avaliacao_atendimento UNIQUE (id_atendimento),
  CONSTRAINT fk_avaliacao_atendimento
    FOREIGN KEY (id_atendimento) REFERENCES atendimento (id_atendimento),
  CONSTRAINT fk_avaliacao_funcionario
    FOREIGN KEY (id_funcionario) REFERENCES funcionario (id_funcionario),
  CONSTRAINT fk_avaliacao_cliente
    FOREIGN KEY (id_cliente) REFERENCES cliente (id_cliente),
  CONSTRAINT ck_avaliacao_nota CHECK (nota BETWEEN 1 AND 5),
  INDEX idx_avaliacao_funcionario (id_funcionario),
  INDEX idx_avaliacao_cliente (id_cliente)
) ENGINE = InnoDB;

-- A aplicação lê as avaliações (para a média) e registra novas. Não altera nem apaga.
GRANT SELECT, INSERT ON oficina_ds.avaliacao_funcionario TO 'oficina_app'@'localhost';

FLUSH PRIVILEGES;
