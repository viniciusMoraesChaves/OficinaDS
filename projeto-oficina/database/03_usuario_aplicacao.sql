CREATE USER IF NOT EXISTS 'oficina_app'@'localhost'
  IDENTIFIED BY 'TroqueEstaSenha123!';

ALTER USER 'oficina_app'@'localhost'
  IDENTIFIED BY 'TroqueEstaSenha123!';

GRANT SELECT ON oficina_ds.* TO 'oficina_app'@'localhost';
GRANT INSERT ON oficina_ds.usuario TO 'oficina_app'@'localhost';
GRANT UPDATE (id_cargo) ON oficina_ds.funcionario TO 'oficina_app'@'localhost';
GRANT UPDATE (id_perfil) ON oficina_ds.usuario TO 'oficina_app'@'localhost';
GRANT INSERT ON oficina_ds.cargo TO 'oficina_app'@'localhost';
FLUSH PRIVILEGES;