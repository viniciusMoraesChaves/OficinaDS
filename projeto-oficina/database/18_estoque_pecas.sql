-- OficinaDS | Estoque de peças (consulta)
-- Execute como root. Idempotente: pode rodar de novo sem erro.
-- O usuário da aplicação já lê todas as tabelas (script 03); não precisa de grant novo.

USE oficina_ds;

CREATE TABLE IF NOT EXISTS peca (
  id_peca INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL,
  nome VARCHAR(150) NOT NULL,
  categoria VARCHAR(60) NOT NULL,
  quantidade_disponivel INT UNSIGNED NOT NULL DEFAULT 0,
  quantidade_minima INT UNSIGNED NOT NULL DEFAULT 0,
  localizacao VARCHAR(60) NOT NULL,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT uq_peca_codigo UNIQUE (codigo),
  CONSTRAINT ck_peca_preco CHECK (preco >= 0),
  INDEX idx_peca_categoria (categoria),
  INDEX idx_peca_nome (nome)
) ENGINE = InnoDB;

-- Dados fictícios. Situação: 0 = indisponível; até o mínimo = estoque baixo; acima = disponível.
INSERT INTO peca
  (codigo, nome, categoria, quantidade_disponivel, quantidade_minima, localizacao, preco)
VALUES
  ('OLE-5W30-1L',  'Óleo de motor 5W30 (1 L)',       'Lubrificantes', 48, 12, 'A1-P1', 38.00),
  ('FLT-OLE-001',  'Filtro de óleo',                 'Filtros',       25, 10, 'A1-P3', 35.00),
  ('FLT-AR-002',   'Filtro de ar do motor',          'Filtros',        6,  8, 'A1-P4', 52.90),
  ('FLT-CAB-003',  'Filtro de cabine',               'Filtros',       14,  6, 'A1-P4', 44.50),
  ('FRE-PAS-DI',   'Pastilha de freio dianteira',    'Freios',         9,  6, 'B2-P1', 140.00),
  ('FRE-DIS-DI',   'Disco de freio dianteiro (par)', 'Freios',         3,  4, 'B2-P2', 289.90),
  ('FRE-FLU-DOT4', 'Fluido de freio DOT 4 (500 ml)', 'Lubrificantes', 20,  8, 'A1-P2', 29.90),
  ('IGN-VEL-001',  'Vela de ignição',                'Ignição',       40, 16, 'C1-P1', 32.00),
  ('IGN-CAB-002',  'Jogo de cabos de ignição',       'Ignição',        0,  3, 'C1-P2', 120.00),
  ('SUS-AMO-DI',   'Amortecedor dianteiro',          'Suspensão',      4,  4, 'D1-P1', 410.00),
  ('SUS-BAN-001',  'Bandeja de suspensão',           'Suspensão',      0,  2, 'D1-P2', 365.00),
  ('ELE-BAT-60',   'Bateria 60 Ah',                  'Elétrica',       7,  3, 'E1-P1', 560.00),
  ('ELE-LAM-H7',   'Lâmpada H7 (par)',               'Elétrica',      18,  6, 'E1-P3', 59.90),
  ('ARR-CON-001',  'Condensador do ar-condicionado', 'Arrefecimento',  2,  2, 'F1-P1', 480.00)
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  categoria = VALUES(categoria),
  quantidade_disponivel = VALUES(quantidade_disponivel),
  quantidade_minima = VALUES(quantidade_minima),
  localizacao = VALUES(localizacao),
  preco = VALUES(preco);
