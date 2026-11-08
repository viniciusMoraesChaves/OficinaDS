-- As permissões abaixo dependem da coluna usuario.id_perfil, criada em
-- 06_associacao_usuario_perfil.sql. Por isso ficam num script separado,
-- em vez de dentro de 03_usuario_aplicacao.sql (que roda antes do 06).

USE oficina_ds;

-- Cadastro de novos usuários (tela de Cadastro / POST /api/cadastro).
GRANT INSERT
ON oficina_ds.usuario
TO 'oficina_app'@'localhost';

-- Troca de perfil ao editar o cargo de um funcionário.
GRANT UPDATE (id_perfil)
ON oficina_ds.usuario
TO 'oficina_app'@'localhost';

FLUSH PRIVILEGES;