-- DM-270 - Pagina Meu Perfil
-- Permissoes para atualizacao dos dados do usuario autenticado.

USE oficina_ds;

GRANT UPDATE (email, senha_hash)
ON oficina_ds.usuario
TO 'oficina_app'@'localhost';

GRANT UPDATE (nome, telefone)
ON oficina_ds.funcionario
TO 'oficina_app'@'localhost';

GRANT UPDATE (nome, telefone, endereco)
ON oficina_ds.cliente
TO 'oficina_app'@'localhost';
