# gymnotebook-back

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
| `CORS_ORIGINS` | Comma-separated origin allowlist, for example `http://localhost:3000,http://localhost:5173`. |
| `LOG_LEVEL` | Pino log level. |
| `MAX_UPLOAD_SIZE` | Multipart file size limit in bytes. |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` | Global rate limit. |
| `AUTH_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW_MS` | Stricter signin/signup rate limit. |
| `SWAGGER_ENABLED` | `true` exposes Swagger UI and JSON at `/docs`; `false` disables them. |

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

## Tests

```bash
pnpm test
pnpm test:integration
pnpm test:coverage
```

`pnpm test` runs unit/Fastify inject tests. `pnpm test:integration` starts MySQL through Testcontainers and requires Docker.

## Health And Shutdown

- `GET /health/live`: process liveness only, no database dependency.
- `GET /health/ready`: runs a lightweight database readiness check and returns the common error contract with `503` when unavailable.

The old `GET /health` endpoint is not registered. The new explicit liveness/readiness paths are used to avoid ambiguity.

`server.ts` handles `SIGINT` and `SIGTERM`, stops accepting requests with `app.close()`, and relies on Fastify lifecycle hooks to close the MySQL pool.
