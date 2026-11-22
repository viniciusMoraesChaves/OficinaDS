-- Permissões do usuário da aplicação nas tabelas novas de
-- atendimento/orçamento. Execute após 09_atendimentos_orcamentos.sql.

USE oficina_ds;

GRANT INSERT, UPDATE ON oficina_ds.atendimento TO 'oficina_app'@'localhost';
GRANT INSERT, UPDATE ON oficina_ds.orcamento TO 'oficina_app'@'localhost';
GRANT INSERT, UPDATE, DELETE ON oficina_ds.orcamento_item TO 'oficina_app'@'localhost';

FLUSH PRIVILEGES;