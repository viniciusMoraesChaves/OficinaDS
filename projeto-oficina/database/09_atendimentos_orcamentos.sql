-- OficinaDS | Aceitar ou recusar orçamento
-- Modelo de atendimento, orçamento e itens de custo do orçamento.
-- Execute após 07_perfil_cliente.sql.

USE oficina_ds;

CREATE TABLE IF NOT EXISTS atendimento (
  id_atendimento INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_cliente INT UNSIGNED NOT NULL,
  id_veiculo INT UNSIGNED NOT NULL,
  id_funcionario INT UNSIGNED NOT NULL,
  status ENUM('aberto', 'concluido', 'cancelado') NOT NULL DEFAULT 'aberto',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_atendimento_cliente
    FOREIGN KEY (id_cliente) REFERENCES cliente (id_cliente),
  CONSTRAINT fk_atendimento_veiculo
    FOREIGN KEY (id_veiculo) REFERENCES veiculo (id_veiculo),
  CONSTRAINT fk_atendimento_funcionario
    FOREIGN KEY (id_funcionario) REFERENCES funcionario (id_funcionario),
  INDEX idx_atendimento_cliente (id_cliente),
  INDEX idx_atendimento_funcionario (id_funcionario)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS orcamento (
  id_orcamento INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_atendimento INT UNSIGNED NOT NULL,
  situacao_veiculo TEXT NOT NULL,
  valor_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  -- rascunho: funcionário ainda editando | enviado: aguardando decisão do cliente
  -- aceito / recusado: decisão já registrada (ver DM-177 / DM-178)
  status ENUM('rascunho', 'enviado', 'aceito', 'recusado') NOT NULL DEFAULT 'rascunho',
  enviado_em DATETIME NULL,
  decidido_em DATETIME NULL, -- DM-177: data/hora da decisão do cliente
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orcamento_atendimento
    FOREIGN KEY (id_atendimento) REFERENCES atendimento (id_atendimento),
  CONSTRAINT ck_orcamento_valor_total CHECK (valor_total >= 0),
  INDEX idx_orcamento_atendimento (id_atendimento),
  INDEX idx_orcamento_status (status)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS orcamento_item (
  id_orcamento_item INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_orcamento INT UNSIGNED NOT NULL,
  descricao VARCHAR(150) NOT NULL, -- peça ou serviço
  valor DECIMAL(10, 2) NOT NULL,
  CONSTRAINT fk_orcamento_item_orcamento
    FOREIGN KEY (id_orcamento) REFERENCES orcamento (id_orcamento),
  CONSTRAINT ck_orcamento_item_valor CHECK (valor >= 0),
  INDEX idx_orcamento_item_orcamento (id_orcamento)
) ENGINE = InnoDB;