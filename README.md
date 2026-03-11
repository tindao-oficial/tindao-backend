# Tindão Backend

Backend do **Tindão** — app de relacionamento focado em organização de eventos e venda de ingressos.

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

### 1. Instalar dependências

```bash
yarn install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com suas credenciais
```

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
# http://localhost:3001
# http://localhost:3001/docs  <- Swagger
```

## Scripts úteis

| Comando | Descrição |
|---|---|
| `yarn dev` | Servidor com hot reload |
| `yarn build` | Build de produção |
| `yarn test` | Rodar testes |
| `yarn lint` | ESLint com auto-fix |
| `yarn prisma:migrate` | Aplicar migrações (dev) |
| `yarn prisma:generate` | Regenerar Prisma client |
| `yarn prisma:studio` | Prisma Studio |

## Referência do boilerplate

Este projeto foi iniciado a partir do [hmake98/nestjs-starter](https://github.com/hmake98/nestjs-starter).
