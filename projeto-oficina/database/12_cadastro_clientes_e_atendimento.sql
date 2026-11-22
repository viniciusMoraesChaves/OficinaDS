-- OficinaDS | Cadastro público de clientes e atendimentos sem funcionário vinculado
-- Execute conectado como root, após o 11_grant_insert_funcionario.sql.
-- Idempotente: pode rodar de novo sem erro.

USE oficina_ds;

-- Cadastro de cliente (tela de Cadastro > "Sou cliente") grava cliente e veículo.
GRANT INSERT ON oficina_ds.cliente TO 'oficina_app'@'localhost';
GRANT INSERT ON oficina_ds.veiculo TO 'oficina_app'@'localhost';

-- Administrador sem registro em "funcionario" também precisa abrir atendimentos.
ALTER TABLE atendimento MODIFY id_funcionario INT UNSIGNED NULL;

FLUSH PRIVILEGES;
