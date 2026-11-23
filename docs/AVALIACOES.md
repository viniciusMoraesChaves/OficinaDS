# Avaliar funcionários

O **Cliente** dá de 1 a 5 estrelas ao funcionário responsável por um atendimento. A oficina
vê a média de cada funcionário.

- Tela do cliente: **Minhas avaliações** (`/minhas-avaliacoes`).
- Média: coluna **Avaliação** da lista de **Funcionários** e bloco "Avaliação dos clientes" no
  diálogo de administração (somente Administrador).

## Regras

| Regra | Como é aplicada |
| --- | --- |
| Nota de 1 a 5, inteira | `lerNota` (`src/utils/avaliacoes.js`) e `CHECK` no banco |
| Só o próprio atendimento | atendimento de outro cliente responde `404`, igual a inexistente |
| Só atendimento **concluído** | `status = 'concluido'` ou etapa do serviço `Concluída` (e nunca cancelado) |
| Uma avaliação por atendimento | consulta prévia (`409`) e `UNIQUE (id_atendimento)` no banco |
| Funcionário avaliado = responsável pelo atendimento | vem do atendimento, nunca da requisição (atendimento sem responsável não pode ser avaliado, `409`) |
| A avaliação não muda depois de enviada | o usuário da aplicação só tem `SELECT` e `INSERT` na tabela |
| Só o cliente avalia | o Administrador passa pela permissão, mas não tem cadastro de cliente e recebe `403` |

## Banco

Script `30_avaliacoes_funcionarios.sql` cria a tabela `avaliacao_funcionario`:

| Coluna | Descrição |
| --- | --- |
| `id_avaliacao` | chave primária |
| `id_atendimento` | atendimento avaliado (único) |
| `id_funcionario` | funcionário responsável pelo atendimento |
| `id_cliente` | cliente que avaliou |
| `nota` | de 1 a 5 |
| `criado_em` | data e hora da avaliação |

## Média

`resumirAvaliacoes(soma, total)` (e `calcularMedia(notas)`) calcula a média com **uma casa
decimal**, arredondando metade para cima (4,25 vira 4,3), com aritmética de inteiros para não errar
por causa de ponto flutuante. Sem nenhuma avaliação a média é `null` e a tela mostra "Sem avaliações".

O banco devolve só a soma e a quantidade de notas de cada funcionário (um `LEFT JOIN` com
`avaliacao_funcionario`), e a média é calculada no backend. Funcionário nunca avaliado continua
aparecendo na lista.

## API

| Método | Rota | Perfil | Descrição |
| --- | --- | --- | --- |
| `GET` | `/api/avaliacoes/meus` | Cliente | Atendimentos concluídos do cliente, os pendentes primeiro, com a nota dada |
| `POST` | `/api/avaliacoes` | Cliente | Registra a avaliação |
| `GET` | `/api/funcionarios` e `/api/funcionarios/:id` | Administrador | Agora trazem `avaliacaoMedia` e `totalAvaliacoes` |

```http
POST /api/avaliacoes
Content-Type: application/json

{ "idAtendimento": 3, "nota": 5 }
```

Respostas: `201` registrada, `400` nota ou atendimento inválidos, `403` não é cliente, `404`
atendimento inexistente ou de outro cliente, `409` não concluído, cancelado, sem funcionário responsável ou já avaliado.

## Como testar

1. Cadastre um cliente em `/cadastro` ("Sou cliente"). O cadastro já cria um veículo.
2. Como Administrador ou Funcionario, abra **Atendimentos**, crie um atendimento para esse
   cliente e veículo e mude a etapa do serviço para **Concluída**.
3. Entre como esse cliente e abra **Minhas avaliações**. Escolha as estrelas e envie.
4. Entre como Administrador, abra **Funcionários** e veja a média do funcionário responsável.

Atalho pelo banco (como `root`) para concluir um atendimento que já existe, trocando `3` pelo id:

```sql
UPDATE ordem_servico SET status = 'Concluída' WHERE id_atendimento = 3;
```

Para repetir o teste, apague as avaliações (o usuário da aplicação não consegue, só o `root`):

```sql
DELETE FROM avaliacao_funcionario;
```

## Testes automatizados

`test/avaliacoes.test.js` (nota, concluído e média), `test/avaliacoesRepository.test.js` (SQL e
duplicidade), `test/avaliacoesController.test.js` (todas as regras acima),
`test/avaliacoesRotas.test.js` (login, perfis e códigos HTTP) e
`test/funcionariosAvaliacao.test.js` (média na lista e no detalhe de funcionários).

## Fora do escopo

Comentário escrito junto da nota, editar ou apagar uma avaliação, avaliar mais de um funcionário
por atendimento e relatórios de desempenho.
