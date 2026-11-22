# Subtarefas e critérios de aceite

Esta divisão pode ser cadastrada diretamente como subtarefas no quadro da sprint.

## DM-67 — Consultar clientes

### Subtarefas sugeridas

1. Criar ou validar tabelas `cliente` e `veiculo` e seus índices.
2. Implementar repository da listagem paginada.
3. Implementar endpoint `GET /api/clientes`.
4. Implementar endpoint `GET /api/clientes/:id` com veículos.
5. Criar tela responsiva de listagem.
6. Criar janela de detalhes, estados de carregamento, vazio e erro.

### Critérios de aceite propostos

- dado que existem clientes, quando a tela abrir, então eles aparecem em ordem alfabética;
- dado que há mais registros que o limite, quando o usuário avança, então vê a próxima página;
- dado um cliente existente, quando clicar em detalhes, então vê dados pessoais e veículos;
- dado um cliente sem veículo, quando abrir detalhes, então vê uma mensagem clara;
- dado um ID inexistente, quando a API for consultada, então responde HTTP 404;
- dado que o banco está indisponível, quando a consulta falhar, então a tela mostra um erro compreensível.

## DM-100 — Pesquisar funcionários

### Subtarefas sugeridas

1. Criar ou validar tabelas `funcionario` e `cargo` e seus índices.
2. Implementar busca parametrizada no repository.
3. Implementar endpoint `GET /api/funcionarios`.
4. Criar formulário de pesquisa e filtro de status.
5. Criar tabela responsiva e paginação.
6. Criar estados inicial, carregando, sem resultado e erro.

### Critérios de aceite propostos

- dado um nome parcial, quando pesquisar, então aparecem funcionários correspondentes;
- dado um CPF parcial, quando pesquisar, então aparecem funcionários correspondentes;
- dado um cargo, quando pesquisar, então aparecem funcionários desse cargo;
- dado o filtro ativos/inativos, quando aplicado, então somente o status escolhido aparece;
- dado um texto sem correspondência, quando pesquisar, então a tela informa que não há resultados;
- dado um limite inválido na API, quando consultar, então responde HTTP 400.

## Definição de pronto para as duas histórias

- frontend usa a API, não dados fixos no JavaScript;
- API consulta MySQL com parâmetros;
- layout funciona em desktop e celular;
- nenhuma senha aparece no código versionado;
- testes automáticos passam;
- critérios manuais foram demonstrados ao grupo;
- contrato da rota está documentado;
- merge foi testado com o restante do sistema.
