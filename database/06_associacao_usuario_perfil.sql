-- Associa cada usuario a um perfil. Execute após o 05_perfis.sql.

USE oficina_ds;

ALTER TABLE usuario
  ADD COLUMN IF NOT EXISTS id_perfil INT UNSIGNED NULL AFTER senha_hash;

ALTER TABLE usuario
  ADD CONSTRAINT fk_usuario_perfil
    FOREIGN KEY (id_perfil) REFERENCES perfil (id_perfil);

ALTER TABLE usuario
  ADD INDEX IF NOT EXISTS idx_usuario_perfil (id_perfil);

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