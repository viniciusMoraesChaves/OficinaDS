-- OficinaDS | DM-180 - Registrar diagnóstico
-- Execute como root após os scripts 01 a 07.

USE oficina_ds;

-- A ordem de serviço é necessária para relacionar o diagnóstico ao atendimento.
-- A coluna id_agendamento fica preparada para a integração com a história de
-- agendamentos, que será implementada por outro integrante do grupo.
CREATE TABLE IF NOT EXISTS ordem_servico (
  id_ordem INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_cliente INT UNSIGNED NOT NULL,
  id_veiculo INT UNSIGNED NOT NULL,
  id_agendamento INT UNSIGNED NULL,
  id_funcionario INT UNSIGNED NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Aberta',
  descricao_problema VARCHAR(1000) NOT NULL,
  data_abertura DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_fechamento DATETIME NULL,
  CONSTRAINT fk_ordem_cliente
    FOREIGN KEY (id_cliente) REFERENCES cliente (id_cliente),
  CONSTRAINT fk_ordem_veiculo
    FOREIGN KEY (id_veiculo) REFERENCES veiculo (id_veiculo),
  CONSTRAINT fk_ordem_funcionario
    FOREIGN KEY (id_funcionario) REFERENCES funcionario (id_funcionario),
  INDEX idx_ordem_cliente (id_cliente),
  INDEX idx_ordem_veiculo (id_veiculo),
  INDEX idx_ordem_funcionario (id_funcionario),
  INDEX idx_ordem_status (status)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS diagnostico (
  id_diagnostico INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_ordem INT UNSIGNED NOT NULL,
  id_funcionario INT UNSIGNED NOT NULL,
  descricao VARCHAR(2000) NOT NULL,
  data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_diagnostico_ordem
    FOREIGN KEY (id_ordem) REFERENCES ordem_servico (id_ordem),
  CONSTRAINT fk_diagnostico_funcionario
    FOREIGN KEY (id_funcionario) REFERENCES funcionario (id_funcionario),
  INDEX idx_diagnostico_ordem (id_ordem),
  INDEX idx_diagnostico_funcionario (id_funcionario),
  INDEX idx_diagnostico_data (data_hora)
) ENGINE = InnoDB;

-- Ordens fictícias para demonstrar e testar a tela.
INSERT INTO ordem_servico
  (id_ordem, id_cliente, id_veiculo, id_agendamento, id_funcionario,
   status, descricao_problema, data_abertura, data_fechamento)
VALUES
  (1, 1, 1, NULL, 2, 'Em diagnóstico',
   'Motor falhando e luz da injeção acesa.', '2026-10-10 08:30:00', NULL),
  (2, 2, 2, NULL, 3, 'Em diagnóstico',
   'Ruído metálico ao frear.', '2026-10-10 09:15:00', NULL),
  (3, 4, 4, NULL, 4, 'Aberta',
   'Ar-condicionado não está resfriando.', '2026-10-11 10:00:00', NULL),
  (4, 5, 5, NULL, 2, 'Em serviço',
   'Vazamento de óleo na parte inferior do motor.', '2026-10-11 13:40:00', NULL)
ON DUPLICATE KEY UPDATE
  id_cliente = VALUES(id_cliente),
  id_veiculo = VALUES(id_veiculo),
  id_funcionario = VALUES(id_funcionario),
  status = VALUES(status),
  descricao_problema = VALUES(descricao_problema);

INSERT INTO diagnostico
  (id_diagnostico, id_ordem, id_funcionario, descricao, data_hora)
VALUES
  (1, 1, 2,
   'Falha de ignição no segundo cilindro causada por vela desgastada. Recomenda-se trocar o jogo de velas e revisar as bobinas.',
   '2026-10-10 10:20:00'),
  (2, 2, 3,
   'Pastilhas de freio dianteiras no limite de desgaste e disco direito com sulcos. Recomenda-se substituir as pastilhas e avaliar a retífica dos discos.',
   '2026-10-10 11:05:00')
ON DUPLICATE KEY UPDATE
  id_ordem = VALUES(id_ordem),
  id_funcionario = VALUES(id_funcionario),
  descricao = VALUES(descricao),
  data_hora = VALUES(data_hora);

-- Permissões mínimas usadas pelo backend nessa história.
GRANT SELECT ON oficina_ds.ordem_servico TO 'oficina_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON oficina_ds.diagnostico TO 'oficina_app'@'localhost';
FLUSH PRIVILEGES;
