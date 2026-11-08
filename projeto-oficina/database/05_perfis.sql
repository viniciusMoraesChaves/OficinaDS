-- Cria o modelo de perfis de usuário (Administrador / Funcionário).
-- Execute conectado como root, após os scripts 01 a 04.
 
USE oficina_ds;
 
CREATE TABLE IF NOT EXISTS perfil (
  id_perfil INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(40) NOT NULL,
  descricao VARCHAR(255),
  CONSTRAINT uq_perfil_nome UNIQUE (nome)
) ENGINE = InnoDB;
 
INSERT INTO perfil (id_perfil, nome, descricao) VALUES
  (1, 'Administrador', 'Acesso completo, incluindo dados financeiros e administrativos'),
  (2, 'Funcionario', 'Acesso às funcionalidades operacionais do dia a dia')
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  descricao = VALUES(descricao);
 