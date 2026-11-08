# Integração com o trabalho do grupo

Sim, cada integrante pode desenvolver frontend, backend e banco da própria história, **desde que o grupo combine os contratos antes de juntar o código**. O maior risco não é técnico; é duas pessoas criarem tabelas, nomes de campos ou estruturas de projeto diferentes para o mesmo conceito.

## Contrato adotado neste módulo

### Tabelas compartilhadas

| Conceito | Nome físico | Chave |
| --- | --- | --- |
| usuário | `usuario` | `id_usuario` |
| cliente | `cliente` | `id_cliente` |
| veículo | `veiculo` | `id_veiculo` |
| funcionário | `funcionario` | `id_funcionario` |
| cargo | `cargo` | `id_cargo` |

No DER, os nomes aparecem em maiúsculas apenas por apresentação. No MySQL, este projeto usa nomes físicos em minúsculas. Isso evita problemas ao mover o banco do Windows para Linux, onde maiúsculas e minúsculas em tabelas podem se comportar de forma diferente.

### Respostas da API

Listas usam sempre:

```json
{
  "dados": [],
  "paginacao": {
    "pagina": 1,
    "limite": 8,
    "total": 0,
    "totalPaginas": 0
  }
}
```

Erros usam:

```json
{
  "erro": "CODIGO_ESTAVEL",
  "mensagem": "Texto compreensível para o usuário."
}
```

Não mudem esses formatos sem avisar quem fez o frontend.

## Rotas que pertencem a este módulo

| História | Rota | Observação |
| --- | --- | --- |
| DM-67 | `GET /api/clientes` | leitura paginada |
| DM-67 | `GET /api/clientes/:id` | detalhes e veículos |
| DM-100 | `GET /api/funcionarios` | pesquisa e filtro |

Outros integrantes podem acrescentar, por exemplo, `POST /api/clientes` ou `PATCH /api/funcionarios/:id`, mas não devem alterar o comportamento dos `GET` sem combinar.

## Processo recomendado de integração

1. Escolham **um repositório central**.
2. Escolham uma pessoa para cuidar da versão oficial do schema do banco.
3. Criem a estrutura base do Express uma única vez.
4. Cada integrante trabalha em uma branch, por exemplo `feature/dm-67-dm-100`.
5. Cada história adiciona rotas, controllers e repositories sem copiar um segundo servidor inteiro.
6. Antes do merge, atualizem a branch com a versão central e resolvam conflitos localmente.
7. Rodem `npm install`, todos os scripts SQL em um banco vazio, `npm test` e testes manuais.
8. Façam o merge somente depois que as rotas antigas continuarem funcionando.

## Como encaixar este módulo em outro backend Express

Se o grupo já possuir `app.js`, não substitua o arquivo inteiro. Transfira:

- `src/routes/clientesRoutes.js`;
- `src/routes/funcionariosRoutes.js`;
- os dois controllers;
- os dois repositories;
- `src/utils/queryParams.js`;
- as duas linhas `app.use(...)`.

As linhas de montagem são:

```js
app.use('/api/clientes', clientesRoutes);
app.use('/api/funcionarios', funcionariosRoutes);
```

Reaproveite o `pool` MySQL oficial do grupo em vez de manter dois pools.

## Como juntar os bancos

O arquivo `01_schema.sql` contém apenas o núcleo necessário às duas histórias. Ao integrar com o DER completo:

1. mantenha exatamente as chaves primárias e estrangeiras combinadas;
2. não crie outra tabela `clientes` no plural;
3. adicione novas tabelas depois das tabelas das quais elas dependem;
4. use `ALTER TABLE` para mudanças incrementais depois que o schema central existir;
5. dê número e nome a cada script, por exemplo `005_criar_ordem_servico.sql`;
6. teste todos os scripts em um banco vazio.

Não permitam que cada branch carregue um `CREATE DATABASE` completo diferente. Na versão integrada, deve existir uma sequência oficial de scripts.

## Autenticação futura

Estas rotas ainda não verificam login porque a história de autenticação é de outro integrante. Na integração final, adicionem o middleware acordado antes dos controllers:

```js
router.get('/', autenticar, autorizar('CONSULTAR_CLIENTE'), clientesController.list);
```

Os nomes `autenticar`, `autorizar` e `CONSULTAR_CLIENTE` são exemplos; usem os nomes decididos pelo grupo.

## Checklist antes do merge

- [ ] os nomes das tabelas e colunas batem com o schema central;
- [ ] não existem duas conexões MySQL diferentes sem necessidade;
- [ ] `.env` não foi enviado ao Git;
- [ ] `node_modules` não foi enviado ao Git;
- [ ] as rotas novas começam com `/api`;
- [ ] erros continuam no formato combinado;
- [ ] scripts SQL funcionam num banco vazio;
- [ ] dados de teste não são dados pessoais reais;
- [ ] todas as histórias antigas continuam funcionando;
- [ ] o grupo testou o sistema a partir de um clone limpo.
