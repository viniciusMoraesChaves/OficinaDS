-- Estoque mínimo de peças e alerta de reposição (DM-191 a DM-198).
-- Execute após 17_atendimentos_realizados.sql.

USE oficina_ds;

CREATE TABLE IF NOT EXISTS peca (
  id_peca INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  quantidade INT NOT NULL DEFAULT 0,
  estoque_minimo INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT uq_peca_nome UNIQUE (nome),
  CONSTRAINT ck_peca_quantidade CHECK (quantidade >= 0),
  CONSTRAINT ck_peca_estoque_minimo CHECK (estoque_minimo >= 0),
  INDEX idx_peca_ativo (ativo)
) ENGINE = InnoDB;

GRANT INSERT, UPDATE ON oficina_ds.peca TO 'oficina_app'@'localhost';

FLUSH PRIVILEGES;

-- Dados de teste (cobrem os casos do DM-198)
INSERT INTO peca (nome, quantidade, estoque_minimo) VALUES
  ('Filtro de óleo', 5, 10),
  ('Pastilha de freio', 9, 10),
  ('Vela de ignição', 10, 10),
  ('Correia dentada', 12, 10),
  ('Óleo 5W30', 13, 10),
  ('Palheta', 0, 0);