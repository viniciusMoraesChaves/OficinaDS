-- OficinaDS | Consultar inadimplências
-- Cobranças (valores a receber dos clientes). Uma cobrança nasce quando o
-- cliente aceita um orçamento e fica inadimplente quando passa do vencimento
-- sem ter sido paga.
-- Execute conectado como root, após 23_pecas_utilizadas.sql. Idempotente.

USE oficina_ds;

CREATE TABLE IF NOT EXISTS cobranca (
  id_cobranca INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_cliente INT UNSIGNED NOT NULL,
  id_veiculo INT UNSIGNED NULL,
  id_orcamento INT UNSIGNED NULL,
  descricao VARCHAR(150) NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATETIME NULL,
  -- pendente: ainda não paga | pago: quitada | cancelado: não será mais cobrada
  status ENUM('pendente', 'pago', 'cancelado') NOT NULL DEFAULT 'pendente',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_cobranca_orcamento UNIQUE (id_orcamento),
  CONSTRAINT fk_cobranca_cliente
    FOREIGN KEY (id_cliente) REFERENCES cliente (id_cliente),
  CONSTRAINT fk_cobranca_veiculo
    FOREIGN KEY (id_veiculo) REFERENCES veiculo (id_veiculo),
  CONSTRAINT fk_cobranca_orcamento
    FOREIGN KEY (id_orcamento) REFERENCES orcamento (id_orcamento),
  CONSTRAINT ck_cobranca_valor CHECK (valor > 0),
  INDEX idx_cobranca_cliente (id_cliente),
  INDEX idx_cobranca_veiculo (id_veiculo),
  INDEX idx_cobranca_situacao (status, data_vencimento)
) ENGINE = InnoDB;

-- A aplicação lê as cobranças, cria uma nova quando o cliente aceita um orçamento
-- e registra o pagamento (UPDATE só das colunas status e data_pagamento).
-- Quem já rodou este script antes pode rodá-lo de novo para receber o UPDATE.
GRANT SELECT, INSERT, UPDATE (status, data_pagamento)
  ON oficina_ds.cobranca TO 'oficina_app'@'localhost';

FLUSH PRIVILEGES;

-- Orçamentos que já foram aceitos antes deste script viram cobrança, com
-- vencimento 15 dias depois da decisão do cliente (mesmo prazo da aplicação).
INSERT INTO cobranca
  (id_cliente, id_veiculo, id_orcamento, descricao, valor, data_vencimento)
SELECT
  a.id_cliente,
  a.id_veiculo,
  o.id_orcamento,
  CONCAT('Orçamento #', o.id_orcamento, ' (atendimento #', a.id_atendimento, ')'),
  o.valor_total,
  DATE_ADD(DATE(COALESCE(o.decidido_em, o.enviado_em, o.criado_em)), INTERVAL 15 DAY)
FROM orcamento o
INNER JOIN atendimento a
  ON a.id_atendimento = o.id_atendimento
WHERE o.status = 'aceito'
  AND o.valor_total > 0
  AND NOT EXISTS (
    SELECT 1 FROM cobranca c WHERE c.id_orcamento = o.id_orcamento
  );
