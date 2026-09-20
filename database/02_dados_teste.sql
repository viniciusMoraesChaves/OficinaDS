-- OficinaOS | Dados fictícios para estudar e demonstrar as duas histórias
-- Pode executar novamente: as chaves fixas impedem duplicação.

USE oficina_ds;

INSERT INTO cargo (id_cargo, nome, descricao) VALUES
  (1, 'Gerente', 'Responsável pela gestão da oficina'),
  (2, 'Mecânico', 'Executa diagnósticos e serviços mecânicos'),
  (3, 'Atendente', 'Realiza atendimento e agendamentos'),
  (4, 'Estoquista', 'Controla peças e movimentações de estoque')
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  descricao = VALUES(descricao);

INSERT INTO funcionario
  (id_funcionario, id_usuario, id_cargo, nome, cpf, email, telefone, data_admissao, ativo)
VALUES
  (1, NULL, 1, 'João Oliveira',    '12345678901', 'joao.oliveira@oficina.test',    '11990001001', '2021-02-01', TRUE),
  (2, NULL, 2, 'Carlos Souza',      '23456789012', 'carlos.souza@oficina.test',     '11990001002', '2022-03-14', TRUE),
  (3, NULL, 2, 'Paulo Lima',        '34567890123', 'paulo.lima@oficina.test',        '11990001003', '2020-08-10', TRUE),
  (4, NULL, 2, 'Marcos Dias',       '45678901234', 'marcos.dias@oficina.test',       '11990001004', '2023-01-09', TRUE),
  (5, NULL, 3, 'Fernanda Rocha',    '56789012345', 'fernanda.rocha@oficina.test',    '11990001005', '2024-05-20', TRUE),
  (6, NULL, 4, 'Ana Beatriz Ramos', '67890123456', 'ana.ramos@oficina.test',         '11990001006', '2022-11-07', TRUE),
  (7, NULL, 2, 'Roberto Pinto',     '78901234567', 'roberto.pinto@oficina.test',     '11990001007', '2019-06-03', FALSE),
  (8, NULL, 3, 'Camila Fernandes',  '89012345678', 'camila.fernandes@oficina.test',  '11990001008', '2025-04-15', TRUE),
  (9, NULL, 2, 'Lucas Pereira',     '90123456789', 'lucas.pereira@oficina.test',     '11990001009', '2026-01-12', TRUE)
ON DUPLICATE KEY UPDATE
  id_cargo = VALUES(id_cargo),
  nome = VALUES(nome),
  email = VALUES(email),
  telefone = VALUES(telefone),
  data_admissao = VALUES(data_admissao),
  ativo = VALUES(ativo);

INSERT INTO cliente
  (id_cliente, id_usuario, nome, cpf, email, telefone, endereco, ativo)
VALUES
  (1,  NULL, 'Ricardo Melo',       '11122233344', 'ricardo.melo@email.test',       '11981110001', 'Rua das Flores, 120 - Centro', TRUE),
  (2,  NULL, 'Ana Carvalho',       '22233344455', 'ana.carvalho@email.test',       '11981110002', 'Av. Brasil, 450 - Jardim América', TRUE),
  (3,  NULL, 'Jorge Santos',       '33344455566', 'jorge.santos@email.test',       '11981110003', 'Rua Paraná, 83 - Bela Vista', TRUE),
  (4,  NULL, 'Patrícia Nunes',     '44455566677', 'patricia.nunes@email.test',     '11981110004', 'Alameda Santos, 912 - Paraíso', TRUE),
  (5,  NULL, 'Cláudia Barros',     '55566677788', 'claudia.barros@email.test',     '11981110005', 'Rua do Comércio, 45 - Centro', TRUE),
  (6,  NULL, 'Thiago Alves',       '66677788899', 'thiago.alves@email.test',       '11981110006', 'Rua Santa Clara, 201 - Norte', TRUE),
  (7,  NULL, 'Bianca Ferreira',    '77788899900', 'bianca.ferreira@email.test',    '11981110007', 'Av. Independência, 700 - Sul', TRUE),
  (8,  NULL, 'Eduardo Costa',      '88899900011', 'eduardo.costa@email.test',      '11981110008', 'Rua dos Pinheiros, 36 - Oeste', TRUE),
  (9,  NULL, 'Mariana Lima',       '99900011122', 'mariana.lima@email.test',       '11981110009', 'Praça da Matriz, 15 - Centro', TRUE),
  (10, NULL, 'Rafael Martins',     '10120230344', 'rafael.martins@email.test',     '11981110010', 'Rua das Acácias, 99 - Leste', FALSE),
  (11, NULL, 'Gabriela Moreira',   '20230340455', 'gabriela.moreira@email.test',   '11981110011', 'Av. Paulista, 1550 - Bela Vista', TRUE),
  (12, NULL, 'Felipe Andrade',     '30340450566', 'felipe.andrade@email.test',     '11981110012', 'Rua Augusta, 442 - Consolação', TRUE)
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  email = VALUES(email),
  telefone = VALUES(telefone),
  endereco = VALUES(endereco),
  ativo = VALUES(ativo);

INSERT INTO veiculo
  (id_veiculo, id_cliente, placa, marca, modelo, ano, cor, chassi)
VALUES
  (1,  1, 'BRA2E19', 'Chevrolet', 'Onix',     2022, 'Prata',    '9BGTESTE000000001'),
  (2,  2, 'ABC4B71', 'Volkswagen','Gol 1.0',  2020, 'Branco',   '9BWTESTE000000002'),
  (3,  3, 'MNO7G32', 'Fiat',      'Argo',     2023, 'Vermelho', '9BDTESTE000000003'),
  (4,  4, 'JKL8A47', 'Honda',     'City',     2021, 'Cinza',    '93HTESTE000000004'),
  (5,  5, 'STU9C24', 'Volkswagen','Polo',     2024, 'Azul',     '9BWTESTE000000005'),
  (6,  5, 'BCD4I12', 'Chevrolet', 'S10',      2019, 'Preto',    '9BGTESTE000000006'),
  (7,  6, 'VWX1I56', 'Jeep',      'Renegade', 2022, 'Branco',   '988TESTE000000007'),
  (8,  7, 'YZA6F78', 'Hyundai',   'HB20',     2023, 'Prata',    '9BHTESTE000000008'),
  (9,  8, 'PQR3D01', 'Renault',   'Kwid',     2021, 'Branco',   '93YTESTE000000009'),
  (10, 9, 'EFG7J35', 'Ford',      'Ka',       2018, 'Preto',    '9BFTESTE000000010'),
  (11, 11,'DEF2Z90', 'Toyota',    'Corolla',  2024, 'Cinza',    '9BRTESTE000000011')
ON DUPLICATE KEY UPDATE
  id_cliente = VALUES(id_cliente),
  marca = VALUES(marca),
  modelo = VALUES(modelo),
  ano = VALUES(ano),
  cor = VALUES(cor),
  chassi = VALUES(chassi);
