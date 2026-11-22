-- OficinaDS | Agendamentos e reagendamento de serviços
-- Execute como root após os scripts 01 a 08 (e depois do 03, que cria o usuário oficina_app).
-- Pode ser executado novamente: a tabela usa IF NOT EXISTS e os dados fictícios têm chave fixa
-- (ao repetir, as datas dos exemplos são recalculadas a partir de hoje).

SET NAMES utf8mb4;

USE oficina_ds;

CREATE TABLE IF NOT EXISTS agendamento (
  id_agendamento INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_cliente INT UNSIGNED NOT NULL,
  id_veiculo INT UNSIGNED NOT NULL,
  id_funcionario INT UNSIGNED NOT NULL,
  servico VARCHAR(150) NOT NULL,
  data_hora DATETIME NOT NULL,
  duracao_minutos SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  status VARCHAR(30) NOT NULL DEFAULT 'Agendado',
  qtd_reagendamentos SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  reagendado_em DATETIME NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_agendamento_status CHECK (
    status IN ('Agendado', 'Confirmado', 'Em atendimento', 'Concluído', 'Cancelado')
  ),
  CONSTRAINT ck_agendamento_duracao CHECK (duracao_minutos > 0),
  CONSTRAINT fk_agendamento_cliente
    FOREIGN KEY (id_cliente) REFERENCES cliente (id_cliente),
  CONSTRAINT fk_agendamento_veiculo
    FOREIGN KEY (id_veiculo) REFERENCES veiculo (id_veiculo),
  CONSTRAINT fk_agendamento_funcionario
    FOREIGN KEY (id_funcionario) REFERENCES funcionario (id_funcionario),
  INDEX idx_agendamento_funcionario_data (id_funcionario, data_hora),
  INDEX idx_agendamento_veiculo_data (id_veiculo, data_hora),
  INDEX idx_agendamento_data (data_hora),
  INDEX idx_agendamento_status (status)
) ENGINE = InnoDB;

-- Datas dos exemplos relativas a hoje. Se o dia cair no domingo (a oficina fecha),
-- soma mais 1 dia. WEEKDAY(): 0 = segunda ... 6 = domingo.

INSERT INTO agendamento
  (id_agendamento, id_cliente, id_veiculo, id_funcionario, servico,
   data_hora, duracao_minutos, status, qtd_reagendamentos, reagendado_em)
VALUES
  (1, 1, 1, 2, 'Revisão dos 20.000 km',
   TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL (3 + (WEEKDAY(DATE_ADD(CURDATE(), INTERVAL 3 DAY)) = 6)) DAY), '09:00:00'), 60, 'Agendado', 0, NULL),
  (2, 2, 2, 3, 'Troca de pastilhas de freio',
   TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL (3 + (WEEKDAY(DATE_ADD(CURDATE(), INTERVAL 3 DAY)) = 6)) DAY), '10:00:00'), 60, 'Confirmado', 0, NULL),
  (3, 4, 4, 2, 'Alinhamento e balanceamento',
   TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL (5 + (WEEKDAY(DATE_ADD(CURDATE(), INTERVAL 5 DAY)) = 6)) DAY), '14:00:00'), 60, 'Agendado', 0, NULL),
  (4, 5, 5, 4, 'Troca de óleo e filtros',
   TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL (6 + (WEEKDAY(DATE_ADD(CURDATE(), INTERVAL 6 DAY)) = 6)) DAY), '08:00:00'), 60, 'Agendado', 1, NOW()),
  (5, 3, 3, 3, 'Diagnóstico do ar-condicionado',
   TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 2 DAY), '15:00:00'), 60, 'Concluído', 0, NULL),
  (6, 6, 7, 4, 'Revisão de suspensão',
   TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL (1 + (WEEKDAY(DATE_ADD(CURDATE(), INTERVAL 1 DAY)) = 6)) DAY), '08:00:00'), 60, 'Agendado', 0, NULL),
  (7, 7, 8, 2, 'Troca da correia dentada',
   TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL (4 + (WEEKDAY(DATE_ADD(CURDATE(), INTERVAL 4 DAY)) = 6)) DAY), '11:00:00'), 60, 'Cancelado', 0, NULL)
ON DUPLICATE KEY UPDATE
  id_cliente = VALUES(id_cliente),
  id_veiculo = VALUES(id_veiculo),
  id_funcionario = VALUES(id_funcionario),
  servico = VALUES(servico),
  data_hora = VALUES(data_hora),
  duracao_minutos = VALUES(duracao_minutos),
  status = VALUES(status),
  qtd_reagendamentos = VALUES(qtd_reagendamentos),
  reagendado_em = VALUES(reagendado_em);

-- Permissões mínimas usadas pelo backend nessa história.
GRANT SELECT, INSERT, UPDATE ON oficina_ds.agendamento TO 'oficina_app'@'localhost';
FLUSH PRIVILEGES;
