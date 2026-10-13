USE oficina_ds;

CREATE TABLE IF NOT EXISTS atendimento (
  id_atendimento INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_veiculo INT UNSIGNED NOT NULL,
  id_funcionario INT UNSIGNED NULL,
  data_atendimento DATETIME NOT NULL,
  status ENUM('Aberto','Em andamento','Aguardando peças','Concluído','Cancelado')
    NOT NULL DEFAULT 'Aberto',
  problema_relatado VARCHAR(500) NOT NULL,
  diagnostico VARCHAR(1000),
  CONSTRAINT fk_atendimento_veiculo
    FOREIGN KEY (id_veiculo) REFERENCES veiculo (id_veiculo),
  CONSTRAINT fk_atendimento_funcionario
    FOREIGN KEY (id_funcionario) REFERENCES funcionario (id_funcionario),
  INDEX idx_atendimento_veiculo_data (id_veiculo, data_atendimento)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS servico_realizado (
  id_servico_realizado INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_atendimento INT UNSIGNED NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  valor DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT ck_servico_valor CHECK (valor >= 0),
  CONSTRAINT fk_servico_atendimento
    FOREIGN KEY (id_atendimento) REFERENCES atendimento (id_atendimento),
  INDEX idx_servico_atendimento (id_atendimento)
) ENGINE = InnoDB;

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

-- Dados fictícios. Veículos 3, 4 e 11 ficam sem atendimentos de propósito (teste de lista vazia).
INSERT INTO atendimento
  (id_atendimento, id_veiculo, id_funcionario, data_atendimento, status, problema_relatado, diagnostico)
VALUES
  (1, 1, 2, '2026-03-10 09:00:00', 'Concluído',        'Revisão dos 20.000 km',          'Sem anormalidades; realizada troca de óleo e filtros'),
  (2, 1, 3, '2026-08-22 14:30:00', 'Concluído',        'Barulho ao frear',               'Pastilhas dianteiras desgastadas'),
  (3, 1, 2, '2026-10-05 10:00:00', 'Em andamento',     'Luz da injeção acesa',           'Sensor de oxigênio com falha (em análise)'),
  (4, 2, 4, '2026-07-14 08:30:00', 'Concluído',        'Motor falhando em baixa rotação','Velas e cabos de ignição com desgaste'),
  (5, 5, 3, '2026-09-01 11:00:00', 'Aguardando peças', 'Vibração no volante',            'Desbalanceamento e amortecedor dianteiro com folga'),
  (6, 6, 9, '2026-02-18 15:00:00', 'Concluído',        'Ar-condicionado não gela',       'Vazamento no condensador')
ON DUPLICATE KEY UPDATE
  id_veiculo = VALUES(id_veiculo),
  id_funcionario = VALUES(id_funcionario),
  data_atendimento = VALUES(data_atendimento),
  status = VALUES(status),
  problema_relatado = VALUES(problema_relatado),
  diagnostico = VALUES(diagnostico);

INSERT INTO servico_realizado (id_servico_realizado, id_atendimento, descricao, valor) VALUES
  (1, 1, 'Troca de óleo e filtros',           220.00),
  (2, 2, 'Troca de pastilhas dianteiras',     180.00),
  (3, 3, 'Leitura de código de falhas',        90.00),
  (4, 4, 'Troca de velas e cabos de ignição', 260.00),
  (5, 5, 'Balanceamento das rodas',            80.00),
  (6, 6, 'Troca do condensador',              650.00),
  (7, 6, 'Recarga de gás do ar-condicionado', 150.00)
ON DUPLICATE KEY UPDATE
  descricao = VALUES(descricao),
  valor = VALUES(valor);

INSERT INTO peca_utilizada (id_peca_utilizada, id_atendimento, nome_peca, quantidade, valor_unitario) VALUES
  (1, 1, 'Óleo 5W30 (litro)',           4,  38.00),
  (2, 1, 'Filtro de óleo',              1,  35.00),
  (3, 2, 'Jogo de pastilhas dianteiras',1, 140.00),
  (4, 4, 'Vela de ignição',             4,  32.00),
  (5, 4, 'Jogo de cabos de ignição',    1, 120.00),
  (6, 6, 'Condensador',                 1, 480.00)
ON DUPLICATE KEY UPDATE
  nome_peca = VALUES(nome_peca),
  quantidade = VALUES(quantidade),
  valor_unitario = VALUES(valor_unitario);