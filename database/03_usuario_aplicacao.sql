-- Cria um usuário local com somente as permissões necessárias à aplicação.
-- A senha abaixo é apenas para desenvolvimento local e coincide com .env.example.

CREATE USER IF NOT EXISTS 'oficina_app'@'localhost'
  IDENTIFIED BY 'TroqueEstaSenha123!';

ALTER USER 'oficina_app'@'localhost'
  IDENTIFIED BY 'TroqueEstaSenha123!';

GRANT SELECT ON oficina_ds.* TO 'oficina_app'@'localhost';
GRANT UPDATE (id_cargo)
ON oficina_ds.funcionario
TO 'oficina_app'@'localhost';
GRANT UPDATE (id_perfil)
ON oficina_ds.usuario
TO 'oficina_app'@'localhost';
GRANT INSERT
ON oficina_ds.cargo --Necessário para funcionar as subtarefas do SCRUM 37
TO 'oficina_app'@'localhost';
FLUSH PRIVILEGES;