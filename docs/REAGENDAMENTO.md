# Agendamento e reagendamento de serviços

Tela: **Agendamentos** (`/agendamentos`), disponível para Administrador e Funcionario.

## Regras de reagendamento

Definidas em `src/utils/regrasAgendamento.js` (constante `REGRAS`):

| Regra | Valor |
| --- | --- |
| Status que permitem reagendar | `Agendado`, `Confirmado` |
| Status que ocupam horário | `Agendado`, `Confirmado`, `Em atendimento` |
| Antecedência para reagendar (em relação ao horário atual) | 24 horas |
| Antecedência do novo horário (em relação a agora) | 2 horas |
| Janela máxima para marcar | 60 dias |
| Duração de cada atendimento | 60 minutos |
| Expediente | Seg–sex 08h–18h, sábado 08h–12h, domingo fechado |
| Capacidade da oficina (atendimentos simultâneos) | 3 |

Conflitos verificados no novo horário: mesmo profissional, mesmo veículo e
capacidade da oficina. O próprio agendamento não conta como conflito.

## API

Todas exigem login (perfil Administrador ou Funcionario).

| Método | Rota | O que faz |
| --- | --- | --- |
| GET | `/api/agendamentos` | Lista agendamentos e informa se cada um pode ser reagendado |
| GET | `/api/agendamentos/opcoes` | Veículos, profissionais ativos e regras |
| GET | `/api/agendamentos/horarios?data=&funcionarioId=&veiculoId=` | Horários livres para um novo agendamento |
| GET | `/api/agendamentos/:id/horarios?data=` | Horários livres para reagendar |
| POST | `/api/agendamentos` | Cria agendamento (`veiculoId`, `funcionarioId`, `servico`, `data`, `hora`) |
| PATCH | `/api/agendamentos/:id/reagendar` | Reagenda (`data` AAAA-MM-DD e `hora` HH:mm) |

Erros de regra de negócio:

- `422` com `STATUS_NAO_PERMITIDO`, `ANTECEDENCIA_INSUFICIENTE`, `FORA_DO_EXPEDIENTE` ou `JANELA_EXCEDIDA`.
- `409` com `CONFLITO_PROFISSIONAL`, `CONFLITO_VEICULO` ou `OFICINA_LOTADA`.
- `404` com `AGENDAMENTO_NAO_ENCONTRADO`.

O reagendamento roda em transação: a linha é bloqueada, o status e os
conflitos são conferidos de novo e só então o `UPDATE` é feito. Assim duas
pessoas não ficam com o mesmo horário.

## Banco

Script `database/09_agendamentos.sql` (rodar depois do `03`). Cria a tabela
`agendamento`, dados de exemplo com datas relativas a hoje e as permissões do
usuário `oficina_app`. Cada reagendamento incrementa `qtd_reagendamentos` e
grava `reagendado_em`.

## Testes

`npm test` (arquivos `test/regrasAgendamento.test.js`,
`test/agendamentosController.test.js`, `test/agendamentosRepository.test.js` e
`test/agendamentosRotas.test.js`).
