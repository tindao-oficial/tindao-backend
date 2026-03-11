# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev                  # Start with hot reload (http://localhost:3001)
yarn build               # Production build
yarn test                # Run Jest tests with SWC
yarn lint                # ESLint with auto-fix
yarn format              # Prettier formatting
yarn prisma:generate     # Generate Prisma client after schema changes
yarn prisma:migrate      # Apply Prisma migrations (dev)
yarn prisma:migrate-prod # Deploy migrations (production)
yarn prisma:studio       # Open Prisma Studio
yarn seed:email          # Seed email templates
docker-compose up        # Start full stack (app, postgres, redis)
```

> **Note:** `yarn install --ignore-engines` is required if running Node 20.3.x (below 20.19) due to @faker-js/faker engine constraint.

To run a single test file: `yarn test --testPathPattern=path/to/spec.ts`

## Architecture

```
src/
├── app/            # Root module, enums (APP_ENVIRONMENT, APP_BULL_QUEUES)
├── common/         # Shared infrastructure modules
│   ├── auth/       # JWT strategies (access + refresh), auth controller
│   ├── aws/        # S3 pre-signed URLs, SES email, HTML templates
│   ├── cache/      # Redis cache wrapper
│   ├── config/     # Config factories (app, auth, aws, redis, doc, mcp)
│   ├── database/   # DatabaseService (PrismaClient wrapper)
│   ├── doc/        # @DocResponse(), @DocPaginated() Swagger decorators
│   ├── file/       # File controller + service (S3 presign workflow)
│   ├── helper/     # HelperPrismaQueryBuilderService, encryption, email helpers
│   ├── logger/     # Pino structured JSON logging
│   ├── mcp/        # MCP tools, resources, prompts (AI integration)
│   ├── message/    # i18n via nestjs-i18n, MessageService
│   ├── request/    # Global guards, @PublicRoute(), @Roles() decorators
│   └── response/   # ResponseInterceptor, ExceptionFilter, response DTOs
├── modules/        # Feature modules (user, post) — controllers, services, DTOs
├── workers/        # Bull queue processors + @nestjs/schedule cron jobs
└── languages/en/   # i18n JSON files (user.json, auth.json, post.json)
```

**Module dependency rule**: Feature modules import `CommonModule` and specific helpers (`HelperModule`, `DatabaseModule`). Feature modules never import each other.

## Key Conventions

### Authentication & Authorization
- **All routes are protected by default** via global `JwtAccessGuard` registered in `RequestModule`
- Use `@PublicRoute()` to bypass JWT (login, signup, health endpoints)
- Use `@Roles(Role.ADMIN)` for role-based access — imports Prisma-generated `Role` enum from `@prisma/client`
- Access tokens: 15min | Refresh tokens: 7 days
- Global guards also apply `ThrottlerGuard` (rate limiting: 15 req/15 min)

### API Response Pattern
Every controller method must use `@DocResponse()`:
```typescript
@DocResponse({
    serialization: UserGetProfileResponseDto,
    httpStatus: HttpStatus.OK,
    messageKey: 'user.success.profile',  // key from src/languages/en/*.json
})
```
`ResponseInterceptor` wraps all responses into `{ statusCode, message, timestamp, data }`.

### Database (Prisma)
- Inject `DatabaseService` from `src/common/database/`
- Use `HelperPrismaQueryBuilderService` for pagination/filtering/sorting (configure `allowedSortFields`, `allowedFilterFields`, `allowedSearchFields`)
- Models use soft deletes (`deletedAt` field) — always filter `where: { deletedAt: null }`
- **After schema changes**: `yarn generate && yarn migrate`

### API Versioning & Controller Naming
- URI-based versioning: `/v1/`, `/v2/`
- `*.public.controller.ts` → authenticated public routes
- `*.admin.controller.ts` → admin-only routes
- Swagger tags: `@ApiTags('public.user')` or `@ApiTags('admin.user')`

### Background Jobs
- Bull queues defined in `APP_BULL_QUEUES` enum (`src/app/enums/app.enum.ts`)
- Processors in `src/workers/processors/`, cron jobs in `src/workers/schedulers/`
- Register queues in feature modules with `BullModule.registerQueue()`

### File Uploads (AWS S3)
- Frontend uploads directly to S3 via pre-signed URLs from `AwsS3Service`
- Backend stores only the S3 key (e.g., `PostImage.key`)

### Testing
- Test files mirror `src/` structure in `test/` directory
- Use `test/mocks/faker.mock.ts` for fake data
- Config: `test/jest.json` (SWC compiler, 90%+ coverage threshold)

### i18n
- Add message keys to `src/languages/en/*.json`
- Use `MessageService` to translate; `ResponseInterceptor` auto-translates via `messageKey`

### MCP (AI Integration)
- Services in `src/common/mcp/` use `@MCPTool()`, `@MCPResource()`, `@MCPPrompt()` from `@hmake98/nestjs-mcp`
- Auto-discovered — no manual registration needed
- Playground at `/mcp/playground`

## Environment
Key variables (see `.env.example`):
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `AUTH_ACCESS_TOKEN_SECRET` / `AUTH_REFRESH_TOKEN_SECRET` — JWT secrets
- `AWS_*` — S3 and SES credentials
- `HTTP_PORT` — defaults to `3001`

Always use `ConfigService.get()`, never `process.env` directly.

## Common Pitfalls
1. Missing `@PublicRoute()` → routes require auth by default
2. Skipping `yarn generate` after Prisma schema changes
3. Controller return type must match `@DocResponse()` serialization class
4. Feature modules must explicitly import `DatabaseModule` or `HelperModule`
5. Import Prisma enums (`Role`, `PostStatus`) from `@prisma/client`, not local files
