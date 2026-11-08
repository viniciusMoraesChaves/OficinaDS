-- Associa cada usuario a um perfil. Execute após o 05_perfis.sql.
-- Idempotente: pode rodar de novo sem erro, mesmo que já tenha sido
-- executado parcialmente antes.

USE oficina_ds;

SET @coluna_existe := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuario'
    AND COLUMN_NAME = 'id_perfil'
);
SET @sql := IF(@coluna_existe = 0,
  'ALTER TABLE usuario ADD COLUMN id_perfil INT UNSIGNED NULL AFTER senha_hash',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_existe := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuario'
    AND CONSTRAINT_NAME = 'fk_usuario_perfil'
);
SET @sql := IF(@fk_existe = 0,
  'ALTER TABLE usuario ADD CONSTRAINT fk_usuario_perfil FOREIGN KEY (id_perfil) REFERENCES perfil (id_perfil)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @indice_existe := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuario'
    AND INDEX_NAME = 'idx_usuario_perfil'
);
SET @sql := IF(@indice_existe = 0,
  'ALTER TABLE usuario ADD INDEX idx_usuario_perfil (id_perfil)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Usuários de exemplo para testar os dois perfis (senha_hash é só um valor fictício).
INSERT INTO usuario (id_usuario, email, senha_hash, id_perfil, ativo) VALUES
  (1, 'joao.rozes@oficina.test', 'hash-fake1', 1, TRUE),
  (2, 'carlos.alcaraz@oficina.test',  'hash-fake2', 2, TRUE)
ON DUPLICATE KEY UPDATE
  id_perfil = VALUES(id_perfil),
  ativo = VALUES(ativo);

-- Liga os funcionários de exemplo (02_dados_teste.sql) aos usuários acima.
UPDATE funcionario SET id_usuario = 1 WHERE id_funcionario = 1; -- João Oliveira -> Administrador
UPDATE funcionario SET id_usuario = 2 WHERE id_funcionario = 2; -- Carlos Souza -> Funcionario