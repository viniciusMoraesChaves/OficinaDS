-- OficinaDS | DM-229 - Dar baixa em peças danificadas
-- Execute como root após 18_estoque_pecas.sql.

USE oficina_ds;

CREATE TABLE IF NOT EXISTS baixa_peca (
  id_baixa INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_peca INT UNSIGNED NOT NULL,
  quantidade INT UNSIGNED NOT NULL,
  motivo VARCHAR(255) NOT NULL,
  id_usuario INT UNSIGNED NOT NULL,
  criada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_baixa_peca_peca
    FOREIGN KEY (id_peca) REFERENCES peca (id_peca),
  CONSTRAINT fk_baixa_peca_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  CONSTRAINT ck_baixa_peca_quantidade CHECK (quantidade > 0),
  INDEX idx_baixa_peca_peca (id_peca),
  INDEX idx_baixa_peca_data (criada_em)
) ENGINE = InnoDB;

GRANT UPDATE ON oficina_ds.peca TO 'oficina_app'@'localhost';
GRANT INSERT ON oficina_ds.baixa_peca TO 'oficina_app'@'localhost';

FLUSH PRIVILEGES;
