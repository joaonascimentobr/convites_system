# Ambiente de desenvolvimento com Devcontainer

Este projeto possui um **Devcontainer** para padronizar o ambiente de desenvolvimento entre os contribuidores.

O ambiente usa:

- Linux via container
- Node.js 24 LTS
- PNPM 9.12.2
- SQLite para desenvolvimento local
- Prisma Client gerado automaticamente
- Frontend Vue/Vite
- Backend NestJS

## Pré-requisitos

Antes de abrir o projeto, tenha instalado:

- Docker Desktop
- VS Code
- Extensão **Dev Containers** no VS Code
- Acesso ao repositório via GitHub/GitLab

Se o repositório usa acesso via SSH, garanta que sua chave SSH esteja configurada na máquina host.

No Windows, pode ser necessário habilitar o `ssh-agent`:

```powershell
Set-Service -Name ssh-agent -StartupType Automatic
Start-Service ssh-agent
ssh-add $env:USERPROFILE\.ssh\id_ed25519
```

Teste o acesso:

```powershell
ssh -T git@github.com
```

## Como abrir o projeto no Devcontainer

No VS Code, abra a pasta do projeto e execute o comando:

```text
Dev Containers: Reopen in Container
```

Na primeira abertura, o container executará automaticamente:

```bash
pnpm install
pnpm --dir apps/backend exec prisma generate
```

Ou seja, ele instala as dependências do monorepo e gera o Prisma Client.

## Preparar o banco SQLite

Depois que o container abrir, execute dentro do terminal do Devcontainer:

```bash
pnpm --dir apps/backend exec prisma migrate dev
```

Depois rode o seed:

```bash
pnpm --dir apps/backend exec prisma db seed
```

Esses comandos criam/preparam o banco SQLite local usado em desenvolvimento.

## Subir backend e frontend juntos

Para iniciar o projeto completo:

```bash
pnpm run dev
```

Esse comando inicia o backend, aguarda o health check responder e só então inicia o frontend.

Portas esperadas:

| Serviço | Porta | URL |
|---|---:|---|
| Backend NestJS/API | 3000 | http://localhost:3000 |
| Health check da API | 3000 | http://localhost:3000/health |
| Frontend Vue/Vite | 5173 | http://localhost:5173 |

## Subir backend e frontend separadamente

Backend:

```bash
pnpm --dir apps/backend start:dev
```

Frontend:

```bash
pnpm --dir apps/frontend dev
```

O frontend deve escutar em `0.0.0.0` para funcionar corretamente via Devcontainer/port forwarding.

## Testes rápidos

Verificar se o frontend está respondendo:

```bash
curl -I http://localhost:5173
```

Verificar se o backend está respondendo:

```bash
curl http://localhost:3000/health
```

Resposta esperada da API:

```json
{"ok":true}
```

A rota raiz do backend pode retornar `404`, e isso é normal:

```text
http://localhost:3000/
```

Use o endpoint `/health` para validar se a API está ativa.

## Arquivos SQLite

O banco SQLite local fica em:

```text
apps/backend/prisma/dev.db
```

Arquivos como estes são gerados em tempo de execução e não devem ser versionados:

```text
apps/backend/prisma/dev.db
apps/backend/prisma/dev.db-shm
apps/backend/prisma/dev.db-wal
apps/backend/prisma/dev.db-journal
```

Para recriar o banco local, use novamente:

```bash
pnpm --dir apps/backend exec prisma migrate dev
pnpm --dir apps/backend exec prisma db seed
```

## Observações sobre Git e quebras de linha

Como o projeto pode ser desenvolvido no Windows, mas executado em container Linux, foi adicionada padronização de final de linha para evitar falsos arquivos modificados no Git.

Dentro do Devcontainer, recomenda-se usar:

```bash
git config --local core.autocrlf false
```

Se aparecerem muitos arquivos modificados sem alteração real, confira com:

```bash
git diff --ignore-cr-at-eol --stat
```

## Problemas comuns

### `Permission denied (publickey)` ao usar Git

O container não está conseguindo acessar sua chave SSH.

Teste dentro do container:

```bash
ssh -T git@github.com
```

Se falhar, carregue a chave no host e reabra o Devcontainer.

No Windows:

```powershell
Start-Service ssh-agent
ssh-add $env:USERPROFILE\.ssh\id_ed25519
```

Depois execute:

```text
Dev Containers: Rebuild and Reopen in Container
```

