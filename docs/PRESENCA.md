# Presença dos funcionários (DM-107)

Página **Presença** (`/presenca`), no menu **Administração**. Só o Administrador acessa; Funcionario e
Cliente recebem `403` em toda a API.

## O que a tela faz

- **Presentes agora:** quem entrou hoje e ainda não registrou a saída (DM-113).
- **Registrar presença:** lista os funcionários ativos com a situação de hoje e o botão de entrada ou
  saída. O horário é o do momento do clique, no servidor (DM-109 e DM-110).
- **Consultar por data:** escolha uma data (hoje por padrão) para ver quem compareceu, com entrada,
  saída, tempo e situação (DM-111 e DM-112).

## Regras

- Um funcionário pode ter mais de um período no mesmo dia (por exemplo, saiu para o almoço), mas só
  **um período aberto por vez**. Uma nova entrada exige a saída anterior.
- Só funcionários **ativos** têm presença registrada.
- Se a saída nunca foi registrada, o período de um dia anterior aparece como **"Saída não
  registrada"**, sem duração inventada.
- Não existem datas futuras. O histórico **não é apagado**: só se registra e se fecha o período.
- Entrada e saída são feitas dentro de uma transação, com a linha do funcionário travada: dois
  cliques ao mesmo tempo não criam dois períodos abertos.
- O banco guarda quem registrou a entrada e a saída (`id_usuario_entrada` e `id_usuario_saida`).

## API (todas exclusivas do Administrador)

| Método | Rota | Resposta |
| --- | --- | --- |
| `GET` | `/api/presencas?data=AAAA-MM-DD` | `dados`, `data` e `resumo` (compareceram, registros, semSaida) |
| `GET` | `/api/presencas/presentes` | `dados` e `total` |
| `GET` | `/api/presencas/funcionarios` | funcionários ativos com a situação de hoje |
| `POST` | `/api/presencas/entrada` | `201`; `409` se já está presente ou está inativo; `404` se não existe |
| `POST` | `/api/presencas/saida` | `200`; `409` se não há entrada em aberto hoje |

O corpo do `POST` é `{ "idFuncionario": 5 }`.

## Banco

`database/32_presenca_funcionarios.sql` cria a tabela `presenca_funcionario`, dá `SELECT`, `INSERT`
e `UPDATE` ao usuário da aplicação e, se a tabela estiver vazia, insere dados de exemplo (ontem, três
funcionários; hoje, um presente). Confira o próximo número livre em `database/` antes de usar.

## Fora do escopo

Registro pelo próprio funcionário, justificativa de faltas, banco de horas e relatório mensal.

## Testes

`test/presencaUtils.test.js` (regras), `test/presencaRepository.test.js` (transações e SQL) e
`test/presencaRotas.test.js` (login, perfis, validação e conflitos).
