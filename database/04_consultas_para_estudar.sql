USE oficina_ds;

-- DM-67: lista clientes e conta quantos veículos cada um possui.
SELECT
  c.id_cliente,
  c.nome,
  c.cpf,
  c.email,
  c.telefone,
  c.ativo,
  COUNT(v.id_veiculo) AS quantidade_veiculos
FROM cliente c
LEFT JOIN veiculo v ON v.id_cliente = c.id_cliente
GROUP BY
  c.id_cliente, c.nome, c.cpf, c.email, c.telefone, c.ativo
ORDER BY c.nome;

-- DM-67: detalhes de um cliente e os veículos dele.
SELECT * FROM cliente WHERE id_cliente = 5;
SELECT * FROM veiculo WHERE id_cliente = 5;

-- DM-100: troca "mec" pelo texto que deseja pesquisar.
SET @busca = '%mec%';

SELECT
  f.id_funcionario,
  f.nome,
  f.cpf,
  f.email,
  f.telefone,
  f.data_admissao,
  f.ativo,
  ca.nome AS cargo
FROM funcionario f
INNER JOIN cargo ca ON ca.id_cargo = f.id_cargo
WHERE
  f.nome LIKE @busca
  OR f.cpf LIKE @busca
  OR f.email LIKE @busca
  OR ca.nome LIKE @busca
ORDER BY f.nome;
