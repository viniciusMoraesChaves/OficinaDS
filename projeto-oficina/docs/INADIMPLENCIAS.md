# Consultar inadimplências

Tela: **Inadimplências** (`/financeiro/inadimplencias`), no menu **Administração**. Só o
Administrador (responsável financeiro) acessa. Funcionario e Cliente recebem `403`.

## De onde vêm os valores

```text
orçamento enviado --cliente aceita--> cobrança (pendente, vence em 15 dias)
```

| Situação da cobrança | Quando |
| --- | --- |
| em dia | `pendente` e vencimento hoje ou no futuro |
| **inadimplente** | `pendente` e vencimento **anterior a hoje** |
| `pago` / `cancelado` | nunca aparecem como inadimplentes |

- A tabela `cobranca` (script `24_inadimplencias.sql`) liga cliente, veículo e orçamento.
- Ao aceitar um orçamento, `orcamentosController.decidirOrcamento` chama
  `cobrancasRepository.criarParaOrcamentoAceito`. Há uma cobrança por orçamento
  (`id_orcamento` é único), então aceitar de novo não duplica.
- Se a criação da cobrança falhar, o aceite do cliente **não** é desfeito: o erro vai para o
  terminal e rodar o `24_inadimplencias.sql` de novo recria o que faltar.
- O prazo (15 dias) fica em `PRAZO_PAGAMENTO_DIAS`, em `src/utils/inadimplencias.js`.
- Os dias de atraso são calculados na consulta (`DATEDIFF(CURDATE(), data_vencimento)`), então
  nada precisa ser atualizado com o passar do tempo.

## O que a tela mostra

- **Resumo:** valor em atraso, cobranças vencidas, clientes inadimplentes, maior atraso e
  valor a vencer (ainda em dia). Não muda com os filtros.
- **Cobranças vencidas:** cliente (CPF e telefone), veículo (a placa abre o histórico do
  veículo), descrição, **vencimento**, atraso (selo por faixa) e **valor**.
- **Clientes com valores em aberto:** cobranças vencidas, vencimento mais antigo, maior atraso
  e total devido por cliente. O botão **Ver cobranças** abre a lista filtrada pelo CPF dele.
- **Filtros:** cliente, CPF ou placa; tempo de atraso; valor mínimo e máximo; período de
  vencimento. **Ordenação:** maior ou menor atraso, maior ou menor valor, cliente (A–Z).
- A busca só procura CPF quando o texto parece um CPF, para a placa `ABC-1D23` não trazer
  clientes cujo CPF contém `123`.

## API

Todas exigem login de Administrador e respondem `400` para filtro inválido.

| Método | Rota | Resposta |
| --- | --- | --- |
| `GET` | `/api/financeiro/inadimplencias` | `dados`, `filtros`, `valorFiltrado`, `paginacao` |
| `GET` | `/api/financeiro/inadimplencias/resumo` | `dados` com os cinco totais |
| `GET` | `/api/financeiro/inadimplencias/clientes` | `dados`, `filtros`, `paginacao` |

Os parâmetros estão no README. A ordenação e a faixa de atraso são escolhidas de listas
fixas no backend: nenhum texto da tela entra direto no SQL.

## Integrações com o resto do sistema

- **Orçamentos:** aceitar um orçamento gera a cobrança.
- **Veículos:** a placa leva ao histórico do veículo.
- **Painel inicial:** o Administrador vê o cartão "Cobranças em atraso" (some se a tabela
  ainda não existir, como os outros indicadores).
- **Financeiro:** a página `/financeiro` passou a ter o atalho para esta tela.

## Consultas no banco

`26_consultas_para_estudar_inadimplencias.sql` reúne, em SQL puro e só com `SELECT`, as
consultas usadas pela aplicação: resumo, cobranças vencidas com filtros, total por cliente,
conferência de orçamentos aceitos sem cobrança e distribuição por faixa de atraso. Serve
para conferir os números da tela direto no Workbench.

## Dados de teste

`25_dados_teste_inadimplencias.sql` cria 9 cobranças de exemplo para os cinco primeiros
clientes ativos (vencidas há 3 a 100 dias, uma a vencer e uma paga). Para apagar:
`DELETE FROM cobranca WHERE descricao LIKE 'Exemplo: %';`

## Fora do escopo

Registrar o pagamento de uma cobrança (o `data_pagamento` já existe na tabela), envio de
lembretes e juros ou multa por atraso.

## Testes

`test/inadimplencias.test.js` (filtros), `test/cobrancasRepository.test.js` (SQL),
`test/inadimplenciasController.test.js` (API e geração da cobrança no aceite),
`test/inadimplenciasRotas.test.js` (login e perfis) e `test/painelInadimplencias.test.js`.
