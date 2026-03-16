# Tindão Backend

Backend do **Tindão** — plataforma universitária de eventos, com suporte a sub-eventos (pre-party / after-party), controle de presença e fluxo de ingressos (em desenvolvimento).

## Stack

- **Framework:** NestJS 11 (TypeScript)
- **Banco de dados:** PostgreSQL + Prisma ORM
- **Cache / Filas:** Redis + Bull
- **Storage:** AWS S3 (uploads)
- **Email:** AWS SES
- **Auth:** JWT (access + refresh tokens) com Argon2
- **Docs:** Swagger/OpenAPI em `/docs`

## Como rodar localmente

### Pré-requisitos

- Node.js >= 20
- Yarn >= 1.22
- Docker + Docker Compose

> Se estiver usando Node 20.3.x (abaixo de 20.19), use `yarn install --ignore-engines`.

### 1. Instalar dependências

```bash
yarn install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com suas credenciais
```

Variáveis obrigatórias para rodar localmente:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | String de conexão PostgreSQL |
| `REDIS_URL` | String de conexão Redis |
| `AUTH_ACCESS_TOKEN_SECRET` | Segredo JWT access token |
| `AUTH_REFRESH_TOKEN_SECRET` | Segredo JWT refresh token |
| `FRONTEND_URL` | URL do frontend (usada nos invite links e QR codes) |

### 3. Subir infraestrutura (PostgreSQL + Redis)

```bash
docker-compose up postgres redis -d
```

### 4. Aplicar migrações e gerar o Prisma client

```bash
yarn prisma:generate
yarn prisma:migrate
```

### 5. Iniciar o servidor

```bash
yarn dev
# API:    http://localhost:3001
# Swagger: http://localhost:3001/docs
```

## Scripts úteis

| Comando | Descrição |
|---------|-----------|
| `yarn dev` | Servidor com hot reload |
| `yarn build` | Build de produção |
| `yarn test` | Rodar testes (Jest + SWC) |
| `yarn lint` | ESLint com auto-fix |
| `yarn format` | Prettier |
| `yarn prisma:migrate` | Aplicar migrações (dev) |
| `yarn prisma:migrate-prod` | Aplicar migrações (produção) |
| `yarn prisma:generate` | Regenerar Prisma client |
| `yarn prisma:studio` | Prisma Studio (GUI do banco) |

## Módulos implementados

| Módulo | Prefixo | Descrição |
|--------|---------|-----------|
| `auth` | `/v1/auth` | Login, signup, refresh, logout |
| `user` | `/v1/user` | Perfil, atualização, deleção |
| `file` | `/v1/file` | Upload via pre-signed URL S3 |
| `event` | `/v1/events` | Criação, listagem, detalhes, cancelamento, sub-eventos, aprovação, convites QR |
| `event-attendance` | `/v1/events`, `/v1/users` | Presença, interesse, histórico do usuário |

## API — Principais endpoints

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/v1/auth/signup` | Cadastro |
| `POST` | `/v1/auth/login` | Login |
| `POST` | `/v1/auth/refresh` | Renovar access token |
| `POST` | `/v1/auth/logout` | Logout |

### Eventos
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `GET` | `/v1/events` | Não | Listar eventos públicos (somente `PUBLISHED`) |
| `GET` | `/v1/events/:id` | Não | Detalhe do evento com sub-eventos e contagens |
| `GET` | `/v1/events/invite/:inviteCode` | Não | Buscar evento por invite code |
| `POST` | `/v1/events` | Sim | Criar evento principal (requer `isOrganizer=true`) — inicia como DRAFT |
| `PUT` | `/v1/events/:id` | Sim | Atualizar evento (organizador) |
| `PATCH` | `/v1/events/:id/publish` | Sim | Publicar evento (organizador) — DRAFT → PUBLISHED |
| `PATCH` | `/v1/events/:id/cancel` | Sim | Cancelar evento (cascata em sub-eventos) |
| `GET` | `/v1/events/:id/my-context` | Sim | Flags de permissão do usuário logado no evento |
| `GET` | `/v1/events/:id/invite` | Sim | Obter link + QR code do evento |
| `POST` | `/v1/events/:id/sub-events` | Sim | Criar sub-evento (pre-party / after-party) |
| `GET` | `/v1/events/:id/sub-events/pending` | Sim | Listar sub-eventos pendentes com paginação (organizador) |
| `PATCH` | `/v1/events/:id/sub-events/:subId/approve` | Sim | Aprovar sub-evento |
| `PATCH` | `/v1/events/:id/sub-events/:subId/reject` | Sim | Rejeitar sub-evento |

### Presença
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `POST` | `/v1/events/:id/interest` | Sim | Marcar interesse |
| `POST` | `/v1/events/:id/going` | Sim | Confirmar presença |
| `POST` | `/v1/events/:id/cancel-attendance` | Sim | Cancelar participação |
| `GET` | `/v1/events/:id/attendees` | Não | Listar participantes (GOING/CHECKED_IN/ATTENDED) |
| `GET` | `/v1/events/:id/interested` | Não | Listar interessados |
| `GET` | `/v1/events/:id/my-attendance` | Sim | Status de presença do usuário logado |

### Usuário
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `GET` | `/v1/user/profile` | Sim | Perfil do usuário logado |
| `PUT` | `/v1/user` | Sim | Atualizar perfil |
| `GET` | `/v1/users/me/events` | Sim | Histórico de eventos do usuário |
| `GET` | `/v1/users/me/organized-events` | Sim | Eventos organizados pelo usuário com contagens |

## Documentação

Consulte a pasta [`docs/`](./docs) para documentação adicional:

- [`docs/features.md`](./docs/features.md) — Guia de features e fluxos de uso para produto/frontend
- [`docs/testing.md`](./docs/testing.md) — Guia completo de testes: como rodar, estrutura e como escrever novos

## Referência do boilerplate

Este projeto foi iniciado a partir do [hmake98/nestjs-starter](https://github.com/hmake98/nestjs-starter).
