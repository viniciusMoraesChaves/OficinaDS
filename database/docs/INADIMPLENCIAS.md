# Consultar inadimplências

Tela: **Inadimplências** (`/financeiro/inadimplencias`), no menu **Administração**. Só o
Administrador (responsável financeiro) acessa. Funcionario e Cliente recebem `403`.

## De onde vêm os valores

```text
orçamento enviado --cliente aceita--> cobrança (pendente) --pagamento registrado--> paga
```

| Situação da cobrança | Quando |
| --- | --- |
| em dia | `pendente` e vencimento hoje ou no futuro |
| **inadimplente** | `pendente` e vencimento **anterior a hoje** |
| `pago` / `cancelado` | nunca aparecem como inadimplentes (o pagamento é registrado na própria tela) |

- A tabela `cobranca` (script `27_inadimplencias.sql`) liga cliente, veículo e orçamento.
- Ao aceitar um orçamento, `orcamentosController.decidirOrcamento` chama
  `cobrancasRepository.criarParaOrcamentoAceito`. Há uma cobrança por orçamento
  (`id_orcamento` é único), então aceitar de novo não duplica.
- Se a criação da cobrança falhar, o aceite do cliente **não** é desfeito: o erro vai para o
  terminal e rodar o `27_inadimplencias.sql` de novo recria o que faltar.
- **Prazo da cobrança** (`PRAZO_PAGAMENTO_DIAS`, em dias a partir do aceite):

  | Ambiente | Padrão | Efeito |
  | --- | --- | --- |
  | desenvolvimento (sem `NODE_ENV=production`) | `-1` | a cobrança **já nasce vencida** (1 dia de atraso), para testar a tela |
  | produção | `15` | a cobrança vence 15 dias depois do aceite |

  Para ver o comportamento real em desenvolvimento, ponha `PRAZO_PAGAMENTO_DIAS=15` no `.env` e
  reinicie o backend. Aceita de `-365` a `365`; outro valor impede o servidor de subir.
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

## Registrar pagamento ("cliente pagou")

- **Marcar como paga** (aba "Cobranças vencidas"): quita aquela cobrança.
- **Cliente pagou** (aba "Clientes com valores em aberto"): quita **todas as cobranças vencidas**
  do cliente de uma vez. As que ainda não venceram continuam pendentes.
- Os dois botões pedem confirmação. Depois, o resumo e as listas são recarregados e o cliente
  deixa de aparecer como inadimplente.
- A cobrança fica com `status = 'pago'` e `data_pagamento` preenchida. Nada é apagado.
- Só cobrança **pendente** pode ser paga: pagar de novo (ou pagar uma cancelada) responde `409`.
- O usuário da aplicação só pode alterar as colunas `status` e `data_pagamento`. Quem já tinha
  rodado o script 27 antes desta funcionalidade precisa **rodá-lo de novo** para receber essa permissão.

## Como testar

Fora de produção, todo orçamento aceito já gera uma cobrança vencida. Também dá para mexer nas
cobranças direto no banco (como `root`):

```sql
-- Atrasar todas as cobranças pendentes que ainda estão em dia (cada uma fica com 1 dia de atraso)
UPDATE cobranca SET data_vencimento = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
WHERE status = 'pendente' AND data_vencimento >= CURDATE();

-- Atrasar só uma cobrança, trocando 12 pelo id_cobranca (veja o id com um SELECT)
UPDATE cobranca SET data_vencimento = DATE_SUB(CURDATE(), INTERVAL 5 DAY) WHERE id_cobranca = 12;

-- Desfazer pagamentos e voltar tudo para pendente (para testar de novo)
UPDATE cobranca SET status = 'pendente', data_pagamento = NULL WHERE status = 'pago';
```

Para achar o id: `SELECT id_cobranca, id_cliente, descricao, valor, data_vencimento, status FROM cobranca;`

## Consultas no banco

`29_consultas_para_estudar_inadimplencias.sql` reúne, em SQL puro e só com `SELECT`, as
consultas usadas pela aplicação: resumo, cobranças vencidas com filtros, total por cliente,
conferência de orçamentos aceitos sem cobrança e distribuição por faixa de atraso. Serve
para conferir os números da tela direto no Workbench.

## Dados de teste

`28_dados_teste_inadimplencias.sql` cria 9 cobranças de exemplo para os cinco primeiros
clientes ativos (vencidas há 3 a 100 dias, uma a vencer e uma paga). Para apagar:
`DELETE FROM cobranca WHERE descricao LIKE 'Exemplo: %';`

## Fora do escopo

Pagamento parcial, estorno do pagamento pela tela, envio de lembretes e juros ou multa por atraso.

## Testes

`test/inadimplencias.test.js` (filtros), `test/cobrancasRepository.test.js` (SQL),
`test/inadimplenciasController.test.js` (API, pagamento e geração da cobrança no aceite),
`test/inadimplenciasRotas.test.js` (login e perfis) e `test/painelInadimplencias.test.js`.
