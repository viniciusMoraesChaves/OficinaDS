-- OficinaDS | Solicitar peças ao superior
-- Execute como root, depois do 03 (usuário da aplicação) e do 18 (tabela peca).
-- Pode ser executado novamente: as tabelas usam IF NOT EXISTS e os pedidos de
-- exemplo têm chave fixa (ao repetir, eles voltam ao estado original).
--
-- Fluxo do pedido: rascunho -> enviado -> aprovado ou rejeitado.

SET NAMES utf8mb4;

USE oficina_ds;

CREATE TABLE IF NOT EXISTS pedido_peca (
  id_pedido INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_funcionario INT UNSIGNED NOT NULL,
  id_atendimento INT UNSIGNED NULL,
  observacao VARCHAR(255) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'rascunho',
  motivo_decisao VARCHAR(255) NULL,
  decidido_por INT UNSIGNED NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  enviado_em DATETIME NULL,
  decidido_em DATETIME NULL,
  CONSTRAINT ck_pedido_peca_status CHECK (
    status IN ('rascunho', 'enviado', 'aprovado', 'rejeitado')
  ),
  CONSTRAINT fk_pedido_peca_funcionario
    FOREIGN KEY (id_funcionario) REFERENCES funcionario (id_funcionario),
  CONSTRAINT fk_pedido_peca_atendimento
    FOREIGN KEY (id_atendimento) REFERENCES atendimento (id_atendimento),
  CONSTRAINT fk_pedido_peca_decisor
    FOREIGN KEY (decidido_por) REFERENCES usuario (id_usuario),
  INDEX idx_pedido_peca_status (status),
  INDEX idx_pedido_peca_funcionario (id_funcionario, criado_em)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS pedido_peca_item (
  id_item INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_pedido INT UNSIGNED NOT NULL,
  id_peca INT UNSIGNED NOT NULL,
  quantidade INT UNSIGNED NOT NULL,
  CONSTRAINT ck_pedido_peca_item_quantidade CHECK (quantidade > 0),
  CONSTRAINT uq_pedido_peca_item UNIQUE (id_pedido, id_peca),
  CONSTRAINT fk_pedido_peca_item_pedido
    FOREIGN KEY (id_pedido) REFERENCES pedido_peca (id_pedido) ON DELETE CASCADE,
  CONSTRAINT fk_pedido_peca_item_peca
    FOREIGN KEY (id_peca) REFERENCES peca (id_peca)
) ENGINE = InnoDB;

-- Pedidos de exemplo (funcionários fictícios do script 02).
INSERT INTO pedido_peca
  (id_pedido, id_funcionario, id_atendimento, observacao, status, motivo_decisao,
   decidido_por, criado_em, enviado_em, decidido_em)
VALUES
  (1, 2, NULL, 'Revisão dos 20.000 km', 'rascunho', NULL,
   NULL, NOW(), NULL, NULL),
  (2, 3, NULL, 'Troca de pastilhas do cliente da manhã', 'enviado', NULL,
   NULL, NOW(), NOW(), NULL),
  (3, 2, NULL, 'Reposição de velas', 'aprovado', NULL,
   (SELECT id_usuario FROM usuario WHERE id_perfil = 1 ORDER BY id_usuario LIMIT 1),
   NOW(), NOW(), NOW()),
  (4, 4, NULL, 'Amortecedores para o próximo atendimento', 'rejeitado',
   'Já temos amortecedores suficientes; use o saldo do estoque.',
   (SELECT id_usuario FROM usuario WHERE id_perfil = 1 ORDER BY id_usuario LIMIT 1),
   NOW(), NOW(), NOW())
ON DUPLICATE KEY UPDATE
  id_funcionario = VALUES(id_funcionario),
  observacao = VALUES(observacao),
  status = VALUES(status),
  motivo_decisao = VALUES(motivo_decisao),
  decidido_por = VALUES(decidido_por),
  enviado_em = VALUES(enviado_em),
  decidido_em = VALUES(decidido_em);

INSERT INTO pedido_peca_item (id_pedido, id_peca, quantidade)
SELECT 1, id_peca, 2 FROM peca WHERE codigo = 'FLT-OLE-001'
ON DUPLICATE KEY UPDATE quantidade = VALUES(quantidade);

INSERT INTO pedido_peca_item (id_pedido, id_peca, quantidade)
SELECT 1, id_peca, 4 FROM peca WHERE codigo = 'OLE-5W30-1L'
ON DUPLICATE KEY UPDATE quantidade = VALUES(quantidade);

INSERT INTO pedido_peca_item (id_pedido, id_peca, quantidade)
SELECT 2, id_peca, 2 FROM peca WHERE codigo = 'FRE-PAS-DI'
ON DUPLICATE KEY UPDATE quantidade = VALUES(quantidade);

INSERT INTO pedido_peca_item (id_pedido, id_peca, quantidade)
SELECT 2, id_peca, 1 FROM peca WHERE codigo = 'FRE-FLU-DOT4'
ON DUPLICATE KEY UPDATE quantidade = VALUES(quantidade);

INSERT INTO pedido_peca_item (id_pedido, id_peca, quantidade)
SELECT 3, id_peca, 4 FROM peca WHERE codigo = 'IGN-VEL-001'
ON DUPLICATE KEY UPDATE quantidade = VALUES(quantidade);

INSERT INTO pedido_peca_item (id_pedido, id_peca, quantidade)
SELECT 4, id_peca, 2 FROM peca WHERE codigo = 'SUS-AMO-DI'
ON DUPLICATE KEY UPDATE quantidade = VALUES(quantidade);

-- Permissões mínimas do usuário da aplicação para esta história.
GRANT SELECT, INSERT, UPDATE ON oficina_ds.pedido_peca TO 'oficina_app'@'localhost';
GRANT SELECT, INSERT ON oficina_ds.pedido_peca_item TO 'oficina_app'@'localhost';
FLUSH PRIVILEGES;
