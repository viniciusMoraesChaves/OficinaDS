-- OficinaDS | DM-261 - Registrar danos na chegada do veiculo
-- Executar como administrador do MySQL apos 24_permissoes_meu_perfil.sql.
-- Idempotente: pode ser executado novamente sem apagar os registros.
USE oficina_ds;

CREATE TABLE IF NOT EXISTS dano_chegada (
  id_dano INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_atendimento INT UNSIGNED NOT NULL,
  id_usuario_registro INT UNSIGNED NOT NULL,
  descricao VARCHAR(1000) NOT NULL,
  registrado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dano_chegada_atendimento
    FOREIGN KEY (id_atendimento) REFERENCES atendimento (id_atendimento),
  CONSTRAINT fk_dano_chegada_usuario
    FOREIGN KEY (id_usuario_registro) REFERENCES usuario (id_usuario),
  INDEX idx_dano_chegada_atendimento (id_atendimento, registrado_em)
) ENGINE = InnoDB;

-- A API lista e registra os danos. Sem permissao de UPDATE/DELETE:
-- registros antigos nao sao apagados ou reescritos acidentalmente.
GRANT SELECT, INSERT ON oficina_ds.dano_chegada TO 'oficina_app'@'localhost';
