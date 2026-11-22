# Publicando a OficinaDS na internet

Este guia coloca o sistema no ar com um endereço (URL) que qualquer pessoa pode abrir,
sem custo: **Aiven** guarda o banco MySQL e **Render** executa a aplicação (Node + o
frontend já compilado).

```
Navegador ──HTTPS──▶ Render (Express + frontend)  ──SSL──▶ Aiven (MySQL)
```

## O que esperar do plano gratuito

- **Render:** depois de 15 minutos sem acessos o serviço "dorme", e o primeiro acesso seguinte
  leva cerca de 1 minuto para acordar. Abra a URL alguns minutos antes de uma apresentação.
  Para nunca dormir, é preciso um plano pago (a partir de US$ 7 por mês).
- **Aiven:** o banco gratuito tem 1 GB e fica ligado, mas a Aiven pode desligá-lo se ele ficar
  sem uso por muito tempo (ela avisa antes). Se isso acontecer, é só ligá-lo de novo no painel.
- Os limites dos planos gratuitos mudam. Confira nas páginas de cada serviço antes de depender
  deles em uma data importante.

## 1. Preparar o repositório

O Render publica a partir do GitHub. Garanta que a branch `main` esteja atualizada com tudo
o que deve ir ao ar. Se o repositório fica em uma organização sem permissão para o Render,
faça um fork na sua conta e publique a partir dele.

## 2. Criar o banco na Aiven

1. Crie uma conta em aiven.io (não pede cartão).
2. Crie um serviço **MySQL** no plano **Free**.
3. Quando o serviço estiver **Running**, copie da aba *Overview*: **Host**, **Port**,
   **User** (normalmente `avnadmin`) e **Password**.

## 3. Criar as tabelas e as contas de demonstração

Na pasta do projeto, no seu computador (troque os valores):

```bash
export DB_HOST='SEU-HOST.aivencloud.com'
export DB_PORT='12345'
export DB_USER='avnadmin'
export DB_PASSWORD='SUA-SENHA'
export DB_NAME='oficina_ds'
export DB_SSL='true'

npm run db:preparar -- --simular   # opcional: só mostra o que será executado
npm run db:preparar                # cria o banco e roda os scripts de database/ em ordem
npm run db:demo                    # cria as contas de demonstração e mostra a senha
```

- `db:preparar` pula os comandos de usuário e permissão (`GRANT`, `CREATE USER`...), porque a
  Aiven já entrega o usuário pronto. Cada script roda uma única vez; pode repetir o comando sem
  medo, ele só aplica o que falta.
- `db:demo` cria `admin@oficinads.test`, `funcionario@oficinads.test` e `cliente@oficinads.test`.
  A senha é mostrada **uma única vez**; anote. Para escolher a senha, use
  `DEMO_SENHA='SuaSenha1' npm run db:demo`.
- Se der erro de "primary key" ou de permissão, copie a mensagem completa para investigar.

## 4. Criar o serviço no Render

1. Em render.com, escolha **New ▸ Web Service** e conecte o repositório (branch `main`).
2. Preencha:
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build:frontend`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
   - **Health Check Path:** `/api/saude`
3. Em **Environment**, adicione:

| Variável | Valor |
| --- | --- |
| `NODE_VERSION` | `22` |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | um texto longo e aleatório (ex.: saída de `openssl rand -hex 32`) |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` | os dados da Aiven |
| `DB_NAME` | `oficina_ds` |
| `DB_SSL` | `true` |
| `DB_TIMEZONE` | `-03:00` |
| `TZ` | `America/Sao_Paulo` |
| `CADASTRO_OFICINA_PUBLICO` | `false` |

   `PORT` o próprio Render define; não crie.
4. Clique em **Create Web Service** e aguarde o deploy. O endereço aparece no topo, no formato
   `https://nome-do-servico.onrender.com`.

## 5. Conferir

- `https://SEU-ENDERECO/api/saude` deve responder `{"status":"ok","aplicacao":"OficinaDS"}`.
- Abra a página inicial e entre com uma conta de demonstração.

## Segurança em um endereço público

- `CADASTRO_OFICINA_PUBLICO=false` impede que qualquer visitante crie uma conta de equipe.
  Clientes continuam podendo se cadastrar; funcionários são criados por um Administrador.
- Nunca coloque o arquivo `.env` no GitHub (ele já está no `.gitignore`) nem a senha do banco
  em mensagens ou prints. Se vazar, troque a senha na Aiven e atualize no Render.
- Sem `JWT_SECRET` próprio, o sistema se recusa a iniciar em produção.
- Para a avaliação, entregue as credenciais ao professor por um canal privado, não no README.

## Atualizando depois

Cada `git push` na `main` faz o Render publicar de novo, automaticamente. Se a mudança incluir
um script SQL novo em `database/`, rode `npm run db:preparar` de novo (com as variáveis da
Aiven) para aplicá-lo.

## Alternativas

- **Railway** (aplicação e MySQL no mesmo lugar, sem dormir): cobra uso a partir de cerca de
  US$ 5 por mês.
- **Túnel temporário** (Cloudflare Tunnel, ngrok): expõe o sistema do seu computador, útil para
  uma demonstração ao vivo, mas só funciona enquanto a máquina estiver ligada.
