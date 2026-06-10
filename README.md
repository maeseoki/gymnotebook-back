# gymnotebook-back

GymNotebook backend rewritten from the legacy Spring Boot service to a Fastify monorepo. The Java backend is retained under `legacy/backend-java` only as a read-only migration reference.

## Stack

- Node.js 24
- TypeScript 6
- native ESM
- pnpm workspaces
- Turborepo
- Fastify 5
- Zod 4
- Drizzle ORM for MySQL
- Vitest 4
- Biome 2

## Repository Structure

```text
apps/api                 Fastify API, Drizzle schema, scripts and tests
packages/contracts       Shared Zod API contracts
packages/typescript-config
docs/migrations          Compatibility and migration documentation
legacy/backend-java      Read-only Spring Boot migration reference
```

The API follows feature-oriented architecture. HTTP modules declare routes/schemas/hooks and call application use cases. Business rules live in application/domain modules; Drizzle access lives in infrastructure modules.

## Toolchain

- Node.js 24
- pnpm 11.5.2 via Corepack

Enable the pinned package manager with:

```bash
corepack enable
corepack prepare pnpm@11.5.2 --activate
```

## Local Startup

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed
pnpm --filter @gymnotebook/api dev
```

For local Docker:

```bash
docker compose up --build
```

The Compose file intentionally uses `NODE_ENV=development` with local-only MySQL credentials. Startup order is:

1. MySQL starts and passes its health check.
2. `api-db-init` runs committed migrations and the idempotent role seed.
3. The API starts and exposes `/health/ready` as its container health check.

Compose publishes MySQL on host port `3307` to avoid clashing with a developer's local MySQL on `3306`. Containers use `db:3306` internally.

## API Configuration

The API validates configuration with Zod at startup and fails fast when required production values are missing.

| Variable | Notes |
| --- | --- |
| `NODE_ENV` | `development`, `test`, or `production`. |
| `HOST`, `PORT` | Listen address used only by `server.ts`. |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | MySQL pool configuration. Production must provide explicit values. |
| `JWT_SECRET` | Required in production, at least 32 characters. |
| `JWT_EXPIRATION_MS` | Token lifetime in milliseconds. |
| `MOBILE_ACCESS_TOKEN_TTL` | Mobile access-token lifetime in milliseconds. |
| `MOBILE_REFRESH_TOKEN_TTL` | Mobile refresh-token/session lifetime in milliseconds. |
| `MOBILE_REFRESH_TOKEN_PEPPER` | Dedicated refresh-token HMAC pepper. Required in production, at least 32 characters, and must not equal `JWT_SECRET`. |
| `MOBILE_REFRESH_TOKEN_BYTES` | Random byte length for generated opaque refresh tokens. Minimum 32. |
| `MOBILE_SESSION_CLEANUP_RETENTION_MS` | Retention window before expired or revoked mobile-session metadata is eligible for cleanup. |
| `CORS_ORIGINS` | Comma-separated origin allowlist, for example `http://localhost:3000,http://localhost:5173`. |
| `LOG_LEVEL` | Pino log level. |
| `MAX_UPLOAD_SIZE` | Multipart file size limit in bytes. |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` | Global rate limit. |
| `AUTH_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW_MS` | Stricter signin/signup rate limit. |
| `SWAGGER_ENABLED` | `true` exposes Swagger UI and JSON at `/docs`; `false` disables them. |
| `DEFAULT_TIMEZONE` | IANA timezone used by workout calendar queries when clients omit `timezone`. |

Requests without an `Origin` header are allowed for server-to-server calls. Browser origins must match `CORS_ORIGINS`; the API never falls back to wildcard CORS in production.

A single `DATABASE_URL` was considered, but the current Docker Compose and Drizzle config already use separate MySQL fields. Keeping separate variables avoids changing the local MySQL setup in this bootstrap task.

## Database

Fresh database:

```bash
pnpm db:migrate
pnpm db:seed
```

Existing Spring Boot database adoption:

```bash
pnpm db:adopt-existing
pnpm db:migrate
pnpm db:seed
```

Take a backup before adoption. The adoption command verifies the legacy table/column surface, records the committed Drizzle baseline in `__drizzle_migrations`, and leaves business data untouched. See `docs/migrations/persistence-foundation.md` for compatibility findings, unverified `SHOW CREATE TABLE` checks, rollback limitations, image ownership staging, and ID precision.

Development-only migration commands:

```bash
pnpm db:generate
pnpm db:check
pnpm db:studio
```

Do not use `drizzle-kit push` for production.

Mobile session cleanup is explicit and safe for future scheduling:

```bash
pnpm db:cleanup-mobile-sessions
```

It deletes only bounded batches of expired or long-revoked mobile-session rows and does not run automatically on requests.

## OpenAPI

When `SWAGGER_ENABLED=true`, Swagger UI and JSON are available under `/docs`. Production can disable both with `SWAGGER_ENABLED=false`.

The OpenAPI document is generated from the registered Fastify/Zod schemas. Binary image retrieval and multipart upload are documented explicitly, and protected routes declare Bearer JWT security.

## Tests

```bash
pnpm test
pnpm test:integration
pnpm test:coverage
```

`pnpm test` runs unit/Fastify inject tests. `pnpm test:integration` starts MySQL through Testcontainers and requires Docker.

Coverage thresholds are non-zero and intentionally realistic for the current architecture. API coverage requires at least 50% statements/lines and 40% branches/functions; contracts require at least 90% statements/branches/lines and 75% functions.

## CI

GitHub Actions runs on pull requests and relevant pushes with Node 24 and pinned Corepack pnpm:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:coverage
pnpm build
pnpm check
docker build -f apps/api/Dockerfile .
```

The workflow requires Docker for Testcontainers and does not deploy.

## Health And Shutdown

- `GET /health/live`: process liveness only, no database dependency.
- `GET /health/ready`: runs a lightweight database readiness check and returns the common error contract with `503` when unavailable.

The old `GET /health` endpoint is not registered. The new explicit liveness/readiness paths are used to avoid ambiguity.

`server.ts` handles `SIGINT` and `SIGTERM`, stops accepting requests with `app.close()`, and relies on Fastify lifecycle hooks to close the MySQL pool.

## Authentication And Users

Authentication uses stateless Bearer JWTs. The JWT payload is:

```ts
{
  sub: string;
  userId: number;
  roles: ERole[];
}
```

`userId` is the authoritative lookup key for current-user operations. `sub` remains the username for compatibility.

New passwords are hashed with Argon2id using explicit parameters in `Argon2PasswordHasher`. Legacy Spring users with BCrypt hashes can still sign in: BCrypt hashes are detected by prefix, verified, and transparently rehashed to Argon2id after a successful signin. Invalid passwords never trigger migration.

Signup is transactional: username/email checks, default role lookup, password hashing, user creation, and `ROLE_USER` assignment succeed or fail together. Database unique constraints remain the race-condition backstop.

Role rules:

- Signup always assigns `ROLE_USER`; unexpected signup fields such as `role` are rejected.
- Only admins can assign/remove elevated roles.
- Only `ROLE_ADMIN` and `ROLE_MODERATOR` can be changed through role-management endpoints.
- Admins cannot delete themselves.
- The final admin cannot be removed or deleted.

`GET /api/auth/logout` is retained only as a stateless compatibility endpoint. Clients using the existing web-compatible flow must discard the token locally; that endpoint does not revoke mobile sessions.

Auth/user compatibility details are documented in `docs/migrations/auth-users-compatibility.md`.

Mobile session foundations are implemented separately from these web-compatible endpoints. The mobile model uses database-backed sessions, opaque rotating refresh tokens stored only as HMAC hashes, and short-lived mobile JWTs with `sessionId` claims. The security design is documented in `docs/architecture/mobile-auth-sessions.md`; mobile HTTP endpoints are deferred.

## Exercises

Exercise endpoints use the JWT `userId` for ownership. Missing and foreign-owned exercises both return `404 exercise_not_found` to avoid resource-existence leaks. Exercise lists are ordered by name and then ID.

New exercise image assignments require the image to have `image_data.user_id` matching the authenticated user. Legacy unresolved images with `user_id = NULL` can still be read through existing exercise references, but cannot be newly assigned until ownership is resolved.

Exercise updates return `200` with the updated exercise. Deletes return `204`, or `409 exercise_in_use` when workout history still references the exercise. Compatibility details are documented in `docs/migrations/exercises-compatibility.md`.

## Images

Images remain database-backed in `image_data` for Spring compatibility. Uploads use multipart field `image`, require authentication, buffer within `MAX_UPLOAD_SIZE`, detect the binary signature with `file-type`, and store the authenticated JWT `userId` as owner.

Supported upload formats are:

- `image/jpeg`
- `image/png`
- `image/webp`

GIF and SVG uploads are rejected. GIF is deferred because animated image handling is not required yet, and SVG is excluded because it is text/XML that can contain active content. Client-provided MIME type and filename extension are not trusted; when a declared image MIME type is present and does not match detected content, the upload returns `415 image_type_mismatch`.

`POST /api/image` now returns a typed JSON body:

```json
{ "id": 123 }
```

`GET /api/image/:id` remains public for frontend compatibility. It returns binary bytes with the stored `Content-Type`, `Content-Length`, `X-Content-Type-Options: nosniff`, `Content-Disposition: inline`, and `Cache-Control: public, max-age=86400`. The cache is deliberately one day rather than immutable because records are not modeled as content-addressed immutable objects.

`DELETE /api/image/:id` requires ownership. Missing, foreign-owned, and unresolved legacy rows with `user_id = NULL` all return `404 image_not_found`. Referenced owned images return `409 image_in_use`; the API does not silently null exercise image references.

Image compatibility details are documented in `docs/migrations/images-compatibility.md`.

## Workouts And History

Workout creation is atomic. The API validates the client-supplied synchronization UUID, verifies every referenced exercise belongs to the authenticated JWT `userId`, inserts the workout, workout groups and individual sets in one transaction, and maps duplicate UUID races to `409 workout_already_exists`.

Workout timestamps must be ISO 8601 instants with an explicit offset or `Z`. The API converts incoming instants to UTC and stores UTC wall-clock values in MySQL `DATETIME`; responses serialize those values as UTC ISO strings with `Z`. Existing legacy `DATETIME` rows may have been written as server-local wall-clock values, so they require an audit before being treated as UTC.

Calendar queries use an explicit IANA timezone:

- `GET /api/workout/days/:month/:year?timezone=Europe/Madrid`
- `GET /api/workout/workouts/:date?timezone=Europe/Madrid`

If `timezone` is omitted, `DEFAULT_TIMEZONE` is used. The default local configuration is `Europe/Madrid`; production can override it.

Workout history uses bounded pagination:

```text
page=0&pageSize=20&sortBy=startDate&sortDirection=desc
```

Allowed sort fields are `startDate`, `endDate` and `id`. Fractional weight and distance values remain unsupported because the legacy schema stores integer measurements.

Workout compatibility details are documented in `docs/migrations/workouts-history-compatibility.md`.

Relevant tests:

```bash
pnpm test
pnpm test:integration
```

## Production Start

Build the API and run the compiled server:

```bash
pnpm --filter @gymnotebook/contracts build
pnpm --filter @gymnotebook/api build
pnpm --filter @gymnotebook/api start
```

For containerized local startup, use Docker Compose. Compose starts MySQL, runs migrations and role seed once through `api-db-init`, then starts the API. Do not run migrations automatically in every API process.

## Compatibility And Release Audit

Capability-specific compatibility notes are in:

- `docs/migrations/auth-users-compatibility.md`
- `docs/migrations/exercises-compatibility.md`
- `docs/migrations/images-compatibility.md`
- `docs/migrations/workouts-history-compatibility.md`
- `docs/migrations/persistence-foundation.md`

The final traceability, endpoint parity, architecture, security, CI and Docker audit is recorded in `docs/release-readiness-audit.md`.

The legacy `/api/test/**` Spring endpoints are intentionally not implemented. They were authorization demonstration routes rather than product API, and tests assert they are unavailable.
