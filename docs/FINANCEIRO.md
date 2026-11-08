# Controle financeiro

Tela **Financeiro** (`/financeiro`), no menu **Administração**. Só o Administrador
(responsável financeiro) acessa; Funcionario e Cliente recebem `403` em toda a API.

## O que a tela mostra

- **Resumo do período:** entradas, saídas, resultado (lucro ou prejuízo) e quantidade de
  movimentações. Os números acompanham os filtros.
- **Filtros:** atalhos de período (este mês, últimos 30 dias, tudo), datas de início e fim,
  tipo, categoria e busca por descrição.
- **Movimentações:** data, descrição e categoria, origem, forma de pagamento e valor, paginadas.
- **Novo lançamento:** tipo, categoria, descrição, valor, data e forma de pagamento (opcional).

## De onde vêm os valores

| Origem | Como entra |
| --- | --- |
| **Lançamento** | Registrado na tela, na tabela `movimentacao_financeira` (script 30). |
| **Cobrança paga** | Entrada automática: toda cobrança com `status = 'pago'` (módulo de inadimplências) aparece como entrada de **Serviços**, na data do pagamento. |

As cobranças pagas **não são copiadas** para a tabela de lançamentos: a consulta soma as duas
fontes. Assim, nada fica duplicado e estornar uma cobrança no outro módulo reflete aqui.
Se a tabela `cobranca` ainda não existe no banco, o financeiro funciona só com os lançamentos.

## Regras dos lançamentos

- Tipo: `entrada` ou `saida`. A categoria precisa ser uma das listas abaixo, conforme o tipo.
- Valor maior que zero, com até 2 casas decimais (aceita `150`, `150,50` e `1.234,56`).
- A data não pode ser futura. A descrição tem de 3 a 150 caracteres.
- Lançamentos **não são editados nem apagados**: um erro se corrige com um novo lançamento.
  O usuário da aplicação só tem `SELECT` e `INSERT` nessa tabela.

| Tipo | Categorias |
| --- | --- |
| Entrada | Serviços, Venda de peças, Outras entradas |
| Saída | Compra de peças, Salários, Aluguel, Água, luz e internet, Impostos, Manutenção, Outras saídas |

## API

Todas exigem login de Administrador.

| Método | Rota | Resposta |
| --- | --- | --- |
| `GET` | `/api/financeiro/movimentacoes` | `dados`, `filtros`, `resumo`, `paginacao` |
| `POST` | `/api/financeiro/movimentacoes` | `201` com o lançamento; `400` se algo for inválido |
| `GET` | `/api/financeiro/movimentacoes/categorias` | categorias por tipo e formas de pagamento |
| `GET` | `/api/financeiro/resumo` | entradas, saídas, resultado, quantidade e período |

Filtros de `GET /movimentacoes` e de `GET /resumo` (todos opcionais): `inicio` e `fim`
(`AAAA-MM-DD`), `tipo` (`todos`, `entrada`, `saida`), `categoria` e `busca`. A listagem aceita
também `pagina` e `limite`.

## Dados de exemplo

`31_dados_teste_movimentacoes.sql` cria 11 lançamentos de exemplo, com datas relativas a hoje.
Para apagar: `DELETE FROM movimentacao_financeira WHERE descricao LIKE 'Exemplo: %';`

## Fora do escopo

Editar ou estornar lançamentos, contas a pagar com vencimento, saídas automáticas (por exemplo
dos pedidos de peças), relatórios em PDF e gráficos.

## Testes

`test/financeiroUtils.test.js` (validações e cálculo do resultado),
`test/movimentacoesRepository.test.js` (SQL, filtros e união com as cobranças) e
`test/movimentacoesRotas.test.js` (login, perfis e respostas da API).
