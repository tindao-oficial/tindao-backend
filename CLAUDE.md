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
├── modules/        # Feature modules — controllers, services, DTOs
│   ├── user/
│   ├── event/
│   └── event-attendance/
├── workers/        # Bull queue processors + @nestjs/schedule cron jobs
└── languages/en/   # i18n JSON files per module (user.json, auth.json, event.json, ...)
```

**Module dependency rule**: Feature modules import `CommonModule` and specific helpers (`HelperModule`, `DatabaseModule`). Feature modules generally never import each other, with one intentional exception:

- `EventModule` imports `EventAttendanceModule` to validate attendee eligibility for sub-event creation (ATTENDEES_ALLOWED mode). This is a one-way dependency and introduces no circular reference.

## Key Conventions

### Authentication & Authorization
- **All routes are protected by default** via global `JwtAccessGuard` registered in `RequestModule`
- Use `@PublicRoute()` to bypass JWT (login, signup, health, and public listing endpoints)
- Use `@Roles(Role.ADMIN)` for role-based access — imports Prisma-generated `Role` enum from `@prisma/client`
- Access tokens: 1d | Refresh tokens: 7 days
- All auth token responses include `expiresAt` (epoch ms) for client-side refresh scheduling
- **Google Sign-In**: `POST /v1/auth/google` accepts `{ idToken }`, validates via `google-auth-library`, upserts user by email/googleId
- User `password` is nullable — Google-only users have no password; email login checks and returns `auth.error.useGoogleLogin` if password is null
- Global guards also apply `ThrottlerGuard` (rate limiting: 10 req/60s)

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
- **After schema changes**: `yarn prisma:generate && yarn prisma:migrate`

### API Versioning & Controller Naming
- URI-based versioning: `/v1/`, `/v2/`
- `*.public.controller.ts` → authenticated public routes
- `*.users.controller.ts` → user-centric routes mounted under `/users`
- `*.admin.controller.ts` → admin-only routes
- Swagger tags: `@ApiTags('public.user')` or `@ApiTags('admin.user')`

### Background Jobs
- Bull queues defined in `APP_BULL_QUEUES` enum (`src/app/enums/app.enum.ts`)
- Processors in `src/workers/processors/`, cron jobs in `src/workers/schedulers/`
- Register queues in feature modules with `BullModule.registerQueue()`

### File Uploads (AWS S3)
- Frontend uploads directly to S3 via pre-signed URLs from `AwsS3Service`
- Backend stores only the S3 key (e.g., `coverImage`)

### Testing
- Test files mirror `src/` structure in `test/` directory
- Use `test/mocks/faker.mock.ts` for fake data
- Config: `test/jest.json` (SWC compiler, 90%+ coverage threshold)

### i18n
- Add message keys to `src/languages/en/<module>.json`
- Use `MessageService` to translate; `ResponseInterceptor` auto-translates via `messageKey`

### MCP (AI Integration)
- Services in `src/common/mcp/` use `@MCPTool()`, `@MCPResource()`, `@MCPPrompt()` from `@hmake98/nestjs-mcp`
- Auto-discovered — no manual registration needed
- Playground at `/mcp/playground`

## Domain: Events + Attendance

### Event hierarchy
- `MAIN` → top-level event created by an organizer
- `PRE_PARTY` / `AFTER_PARTY` → sub-events linked via `parentEventId` + `rootEventId`
- Sub-events can be created by the organizer or by eligible attendees depending on `SubEventPermissionMode`

### SubEventPermissionMode
| Value | Who can create sub-events |
|-------|--------------------------|
| `DISABLED` | Nobody |
| `ORGANIZER_ONLY` | Only the event organizer |
| `ATTENDEES_ALLOWED` | Organizer + eligible attendees (GOING / CHECKED_IN / ATTENDED) |

### Event publish flow
- Events are created in `DRAFT` status and are NOT visible in public listings
- Organizer must explicitly call `PATCH /events/:id/publish` to move to `PUBLISHED`
- `listEvents()` filters by `status = PUBLISHED` for `MAIN` events
- Cancelled events cannot be published

### SubEvent approval flow
- Sub-events created by the **organizer** → `approvalStatus = APPROVED`, `status = PUBLISHED` immediately
- Sub-events created by an **attendee** → `approvalStatus = PENDING`, `status = DRAFT`, invisible from public listings
- Organizer approves via `PATCH /events/:id/sub-events/:subId/approve` → sets both `APPROVED` + `PUBLISHED`
- `REJECTED` sub-events stay in DB but never appear publicly
- **Duplicate prevention**: a user cannot have two PENDING or APPROVED sub-events of the same type for the same parent event
- **Date constraints**: PRE_PARTY must end before main event starts; AFTER_PARTY must start after main event ends

### Attendance status strength order
```
CANCELLED < INTERESTED < GOING < CHECKED_IN < ATTENDED
```
- Status transitions never downgrade a stronger status (except `cancelAttendance` which always sets CANCELLED)
- Only `GOING`, `CHECKED_IN`, `ATTENDED` are considered **eligible** for sub-event creation rights
- `INTERESTED` alone is **not** eligible — this boundary will also apply to future ticket-based access

### Invite codes
- Every event gets a unique 16-char hex `inviteCode` at creation
- `inviteUrl` is built from `FRONTEND_URL` env var: `${FRONTEND_URL}/events/${inviteCode}`
- QR codes are generated server-side via the `qrcode` library (base64 data URL, 300px)
- Invite links are public — scanning them doesn't require auth

## Environment
Key variables (see `.env.example`):
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `AUTH_ACCESS_TOKEN_SECRET` / `AUTH_REFRESH_TOKEN_SECRET` — JWT secrets
- `AWS_*` — S3 and SES credentials
- `FRONTEND_URL` — Used to build event invite URLs and QR codes
- `HTTP_PORT` — defaults to `3001`

Always use `ConfigService.get()`, never `process.env` directly.

## Response DTOs — Critical Pattern
- `ResponseInterceptor` uses `plainToInstance(SerializationClass, data, { excludeExtraneousValues: true })`
- **Only fields decorated with `@Expose()` appear in the response**
- Nested object arrays **must** have both `@Expose()` and `@Type(() => NestedClass)` to be properly transformed
- Pagination DTOs must have `@Expose()` on both `items` and `nextCursor`

## Common Pitfalls
1. Missing `@PublicRoute()` → routes require auth by default
2. Skipping `yarn prisma:generate` after schema changes → runtime crash on new enum values
3. Controller return type must match `@DocResponse()` serialization class
4. Feature modules must explicitly import `DatabaseModule` or `HelperModule`
5. Import Prisma enums (`Role`, `EventType`, etc.) from `@prisma/client`, not local files
6. Nested arrays in response DTOs require `@Type(() => NestedClass)` — without it `excludeExtraneousValues` strips all nested fields
7. `EventModule` intentionally imports `EventAttendanceModule` — do not remove this dependency
8. `isOrganizer` is admin-only — it cannot be set via the regular user update endpoint (`PUT /user`); use the admin endpoint `PATCH /v1/admin/user/:id/role` + `isOrganizer` toggling requires a separate admin action
9. `getUserContext()` returns all `false` flags for cancelled events — do not rely on organizer-check alone when computing permissions
10. Deleting a user (`deleteUser`) cascades to cancel their DRAFT/PUBLISHED events before soft-deleting the user record
