-- OficinaDS | Controle financeiro: movimentações (entradas e saídas)
-- Execute conectado como root. Idempotente: pode rodar de novo sem erro.
--
-- Cada linha é um lançamento manual do responsável financeiro (Administrador).
-- As entradas de cobranças pagas (tabela "cobranca", do módulo de inadimplências)
-- não são copiadas para cá: a aplicação as soma na consulta, então nada fica duplicado.

USE oficina_ds;

CREATE TABLE IF NOT EXISTS movimentacao_financeira (
  id_movimentacao INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('entrada', 'saida') NOT NULL,
  categoria VARCHAR(60) NOT NULL,
  descricao VARCHAR(150) NOT NULL,
  valor DECIMAL(12, 2) NOT NULL,
  data_movimentacao DATE NOT NULL,
  forma_pagamento ENUM('dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'boleto', 'transferencia') NULL,
  -- Quem registrou. Fica NULL nos lançamentos de exemplo.
  id_usuario INT UNSIGNED NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_movimentacao_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  CONSTRAINT ck_movimentacao_valor CHECK (valor > 0),
  INDEX idx_movimentacao_data (data_movimentacao),
  INDEX idx_movimentacao_tipo_data (tipo, data_movimentacao)
) ENGINE = InnoDB;

-- A aplicação lê e registra lançamentos. Não há UPDATE nem DELETE de propósito:
-- lançamento financeiro não se apaga; um erro é corrigido com um novo lançamento.
GRANT SELECT, INSERT ON oficina_ds.movimentacao_financeira TO 'oficina_app'@'localhost';

FLUSH PRIVILEGES;
