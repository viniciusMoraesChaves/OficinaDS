# Solicitar peças ao superior

Tela: **Pedidos de peças** (`/pedidos-pecas`), no menu **Operação**, para Administrador e
Funcionario. O Cliente não tem acesso.

## Fluxo do pedido

```text
rascunho --enviar--> enviado --decisão--> aprovado
                                     \--> rejeitado
```

| Situação | Significado | Quem muda |
| --- | --- | --- |
| `rascunho` | Pedido salvo, ainda não enviado | criado pelo solicitante |
| `enviado` | Aguardando decisão do superior | só o solicitante envia o próprio rascunho |
| `aprovado` | Superior aprovou | só o Administrador |
| `rejeitado` | Superior rejeitou, com motivo | só o Administrador |

Regras (em `src/utils/pedidosPecas.js`):

- cada pedido tem de 1 a 20 peças diferentes, com quantidade inteira de 1 a 999;
- a mesma peça não se repete no pedido (a tela soma as quantidades);
- o pedido pode ter um atendimento em andamento e uma observação (até 255 caracteres);
- o solicitante é sempre o funcionário do usuário logado, nunca um valor enviado pela tela;
- **Funcionario** vê só os próprios pedidos; **Administrador** vê todos;
- o Administrador **não aprova nem rejeita um pedido que ele mesmo criou**;
- rejeitar exige motivo (mínimo de 3 caracteres);
- só pedidos `enviado` podem ser decididos, e só `rascunho` pode ser enviado. As
  mudanças usam `UPDATE ... WHERE status = ...`, então duas pessoas não decidem o mesmo
  pedido ao mesmo tempo (a segunda recebe 409).

A aprovação **não altera o estoque**. Dar baixa e registrar o recebimento das peças fica
para uma próxima história.

## API

Todas exigem login.

| Método | Rota | Perfis | O que faz |
| --- | --- | --- | --- |
| GET | `/api/pedidos-pecas?status=&pagina=&limite=` | Admin, Funcionario | Lista pedidos e o resumo por situação |
| GET | `/api/pedidos-pecas/opcoes` | Admin, Funcionario | Peças ativas e atendimentos em andamento |
| GET | `/api/pedidos-pecas/:id` | Admin, Funcionario | Detalhes e itens (Funcionario só dos próprios) |
| POST | `/api/pedidos-pecas` | Admin, Funcionario | Cria o pedido |
| PATCH | `/api/pedidos-pecas/:id/enviar` | Admin, Funcionario | Envia o rascunho ao superior |
| PATCH | `/api/pedidos-pecas/:id/decisao` | Admin | Aprova ou rejeita |

Criar um pedido:

```http
POST /api/pedidos-pecas
Content-Type: application/json

{
  "itens": [{ "pecaId": 1, "quantidade": 2 }, { "pecaId": 4, "quantidade": 1 }],
  "atendimentoId": 3,
  "observacao": "Para o carro que chega amanhã",
  "enviar": true
}
```

Decidir um pedido:

```http
PATCH /api/pedidos-pecas/7/decisao
Content-Type: application/json

{ "decisao": "rejeitado", "motivo": "Já temos essa peça em estoque" }
```

Erros de regra: `403` (`SOMENTE_O_SOLICITANTE`, `PROPRIO_PEDIDO`, `USUARIO_SEM_FUNCIONARIO`),
`422` (`STATUS_NAO_PERMITIDO`), `409` (já decidido por outra pessoa), `404`
(`PEDIDO_NAO_ENCONTRADO`) e `400` (dados inválidos).

## Banco

Script `database/19_pedidos_pecas.sql` (rodar depois do `03` e do `18`). Cria
`pedido_peca` e `pedido_peca_item`, 4 pedidos de exemplo e as permissões do usuário
`oficina_app`. Os pedidos de exemplo pertencem a funcionários fictícios do script 02, então
aparecem para o Administrador. Cada funcionário real enxerga os pedidos que ele criar.

## Testes

`test/pedidosPecas.test.js`, `test/pedidosPecasController.test.js`,
`test/pedidosPecasRepository.test.js` e `test/pedidosPecasRotas.test.js`.
