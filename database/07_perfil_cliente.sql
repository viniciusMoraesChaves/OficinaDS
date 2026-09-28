-- OficinaOS | Controlar perfis e permissões
-- Adiciona o terceiro perfil de acesso: Cliente (portal do cliente, a implementar).
-- Execute após 05_perfis.sql e 06_associacao_usuario_perfil.sql.

USE oficina_ds;

INSERT INTO perfil (id_perfil, nome, descricao) VALUES
  (3, 'Cliente', 'Acesso restrito aos próprios dados, quando o portal do cliente existir')
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  descricao = VALUES(descricao);