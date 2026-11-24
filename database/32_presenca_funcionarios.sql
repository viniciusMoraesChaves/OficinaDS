-- OficinaDS | Presença dos funcionários (DM-107)
-- Execute conectado como root. Idempotente: pode rodar de novo sem erro.
--
-- Cada linha é um período de presença: uma entrada e, depois, a saída.
-- Um funcionário pode ter mais de um período no mesmo dia (ex.: saiu para o almoço),
-- mas só um período aberto por vez; isso é garantido pela aplicação.

USE oficina_ds;

CREATE TABLE IF NOT EXISTS presenca_funcionario (
  id_presenca INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_funcionario INT UNSIGNED NOT NULL,
  data_presenca DATE NOT NULL,
  entrada_em DATETIME NOT NULL,
  saida_em DATETIME NULL,
  -- Quem registrou a entrada e a saída (Administrador).
  id_usuario_entrada INT UNSIGNED NULL,
  id_usuario_saida INT UNSIGNED NULL,
  CONSTRAINT fk_presenca_funcionario
    FOREIGN KEY (id_funcionario) REFERENCES funcionario (id_funcionario),
  CONSTRAINT fk_presenca_usuario_entrada
    FOREIGN KEY (id_usuario_entrada) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_presenca_usuario_saida
    FOREIGN KEY (id_usuario_saida) REFERENCES usuario (id_usuario),
  CONSTRAINT ck_presenca_saida CHECK (saida_em IS NULL OR saida_em >= entrada_em),
  INDEX idx_presenca_data (data_presenca),
  INDEX idx_presenca_funcionario_data (id_funcionario, data_presenca)
) ENGINE = InnoDB;

-- Registrar a saída é um UPDATE. Não há DELETE de propósito: o histórico não se apaga.
GRANT SELECT, INSERT, UPDATE ON oficina_ds.presenca_funcionario TO 'oficina_app'@'localhost';

FLUSH PRIVILEGES;

-- Dados de exemplo (só quando a tabela está vazia): ontem, três funcionários ativos
-- trabalharam o dia todo; hoje, o primeiro deles chegou e continua presente.
SET @tabela_vazia := (SELECT COUNT(*) = 0 FROM presenca_funcionario);

INSERT INTO presenca_funcionario (id_funcionario, data_presenca, entrada_em, saida_em)
SELECT f.id_funcionario,
       DATE_SUB(CURDATE(), INTERVAL 1 DAY),
       TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '08:02:00'),
       TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '17:10:00')
FROM (SELECT id_funcionario FROM funcionario WHERE ativo = 1 ORDER BY id_funcionario LIMIT 3) f
WHERE @tabela_vazia;

INSERT INTO presenca_funcionario (id_funcionario, data_presenca, entrada_em)
SELECT f.id_funcionario, CURDATE(), TIMESTAMP(CURDATE(), '07:55:00')
FROM (SELECT id_funcionario FROM funcionario WHERE ativo = 1 ORDER BY id_funcionario LIMIT 1) f
WHERE @tabela_vazia;
