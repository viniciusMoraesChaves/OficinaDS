-- Cria um usuário local com somente as permissões necessárias à aplicação.
-- A senha abaixo é apenas para desenvolvimento local e coincide com .env.example.

CREATE USER IF NOT EXISTS 'oficina_app'@'localhost'
  IDENTIFIED BY 'TroqueEstaSenha123!';

ALTER USER 'oficina_app'@'localhost'
  IDENTIFIED BY 'TroqueEstaSenha123!';

GRANT SELECT ON oficina_ds.* TO 'oficina_app'@'localhost';
FLUSH PRIVILEGES;
