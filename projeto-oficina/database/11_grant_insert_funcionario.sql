-- OficinaDS | Permite que a aplicação cadastre novos funcionários
-- (tela Funcionários > Novo funcionário, feita pelo Administrador).

USE oficina_ds;

GRANT INSERT ON oficina_ds.funcionario TO 'oficina_app'@'localhost';

FLUSH PRIVILEGES;
