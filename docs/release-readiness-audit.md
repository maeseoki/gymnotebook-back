# Release Readiness Audit

This document records the final Fastify rewrite audit. It is intentionally scoped to parity, safety, tests and release readiness; it does not add new product features.

## Requirement Traceability

| Requirement | Status | Evidence / decision |
| --- | --- | --- |
| Replace Spring Boot runtime with Node 24, native ESM, Fastify 5, Zod 4, TypeScript 6, pnpm workspaces and Turborepo | Implemented | Root and workspace manifests, Turbo tasks, Dockerfile and CI use the pinned Node/pnpm stack. |
| Central typed configuration with production-safe defaults | Implemented | `apps/api/src/shared/env.ts` validates runtime configuration once; direct application reads from `process.env` are limited to entry/configuration code. |
| Fastify bootstrap, logging, CORS, Swagger, health, rate limits, multipart and graceful shutdown | Implemented | `apps/api/src/app.ts`, `server.ts`, plugin configuration and `tests/app.test.ts`. Health probes are excluded from rate limiting; HSTS is production-only. |
| Shared common error contract | Implemented | All infrastructure/application errors map to `{ statusCode, code, message, details?, requestId? }`. Route handlers no longer return ad hoc `{ message }` infrastructure errors. |
| Drizzle/MySQL schema, migrations, seed, adoption tooling and Testcontainers tests | Implemented | `apps/api/drizzle`, `apps/api/scripts`, persistence docs and integration tests. Production adoption still requires live `SHOW CREATE TABLE` verification. |
| Auth and users refactored into feature architecture | Implemented | Auth/user domain, application, infrastructure and HTTP layers are split; signup and role changes are transactional. |
| Exercises refactored and ownership-secured | Implemented | Exercise routes call use cases only; image assignment checks ownership through an exercise-owned image access port. |
| Images refactored and secured | Implemented | Upload uses file signature detection, owner assignment, typed response, public binary retrieval and ownership-aware deletion. |
| Workouts and workout history refactored | Implemented | Creation is atomic; exercise IDs are validated in a set; reads are timezone-aware and bounded; history uses pagination and allowlisted sorting. |
| Development/test-only `/api/test/**` Spring endpoints | Intentionally changed | Not implemented. They were demo authorization probes, not product endpoints. Tests assert they are unavailable, including in production mode. |
| Legacy Java source disposition | Implemented | Retained under `legacy/backend-java` as read-only migration reference and excluded from Docker context. |
| Clean production deployment automation | Not applicable | CI builds and validates; deployment is intentionally outside this rewrite. |

## Endpoint Compatibility Matrix

| Route | Auth / role | Success | Parity decision | Regression coverage |
| --- | --- | --- | --- | --- |
| `POST /api/auth/signin` | Public, auth rate limit | `200` JWT response | Preserved path; response is schema-backed; invalid credentials are indistinguishable. | Unit, HTTP and integration tests. |
| `POST /api/auth/signup` | Public, auth rate limit | `201` with `Location` | Preserved path; signup role input is rejected to prevent escalation. | Unit, HTTP and integration tests. |
| `GET /api/auth/logout` | Public | `200` stateless message | Retained only for client compatibility; no token revocation. | HTTP tests. |
| `GET /api/exercise` | Bearer user | `200` owned list | Preserved path; deterministic ordering and ownership isolation. | Unit, HTTP and integration tests. |
| `GET /api/exercise/:id` | Bearer user | `200` owned exercise | Foreign-owned resources return `404`. | Unit, HTTP and integration tests. |
| `POST /api/exercise` | Bearer user | `201` exercise | Image assignment now requires owned image. | Unit, HTTP and integration tests. |
| `PUT /api/exercise/:id` | Bearer user | `200` updated exercise | Changed from legacy `201`; request body cannot override ID. | Unit, HTTP and integration tests. |
| `DELETE /api/exercise/:id` | Bearer user | `204` | Referenced exercises return `409 exercise_in_use`. | Unit, HTTP and integration tests. |
| `GET /api/image/:id` | Public | `200` binary | Preserved public retrieval; adds safe headers and one-day cache. | Unit, HTTP and integration tests. |
| `POST /api/image` | Bearer user | `201 { id }` | Changed from bare number; validates actual file signature. | Unit, infrastructure, HTTP and integration tests. |
| `DELETE /api/image/:id` | Bearer user | `204` | Now ownership-aware; referenced images return `409`. | Unit, HTTP and integration tests. |
| `POST /api/workout` | Bearer user | `201` | Atomic graph creation; UUID duplicates return stable `409`. | Unit, HTTP and integration tests. |
| `GET /api/workout/days/:month/:year` | Bearer user | `200` day numbers | Adds explicit/default IANA timezone semantics. | Unit, HTTP and integration tests. |
| `GET /api/workout/workouts/:date` | Bearer user | `200` nested graph | Adds strict date validation, UTC storage/read policy and deterministic ordering. | Unit, HTTP and integration tests. |
| `GET /api/workout-sets/exercise/:exerciseId` | Bearer user | `200` page | Preserved path; bounded pagination and allowlisted sorting. | Unit, HTTP and integration tests. |
| `GET /api/user` | Bearer moderator/admin | `200` public users | Password hashes excluded; no N+1 role loading. | Unit, HTTP and integration tests. |
| `GET /api/user/verifyuser/:username/:email` | Bearer user | `200` or conflict | Retained for frontend compatibility; errors use common contract. | HTTP tests. |
| `GET /api/user/verifyuser` | Bearer user | `200` availability object | Added future-facing query endpoint. | Unit and HTTP tests. |
| `GET /api/user/me` | Bearer user | `200` current user | Uses JWT `userId`, not username lookup. | Unit, HTTP and integration tests. |
| `PUT /api/user/setpermissions` | Bearer admin | `200` | Only admin/moderator roles can be assigned. | Unit, HTTP and integration tests. |
| `PUT /api/user/removepermissions` | Bearer admin | `200` | `ROLE_USER` cannot be removed through this endpoint. | Unit, HTTP and integration tests. |
| `DELETE /api/user/:id` | Bearer admin | `204` | Self-delete and final-admin delete are blocked. | Unit, HTTP and integration tests. |
| `/api/test/**` | None | `404` | Intentionally removed; not product API. | Fastify inject tests. |

## Architecture Summary

- HTTP route modules contain schemas, hooks, request/response mapping and use-case calls.
- Drizzle imports are confined to infrastructure, database setup, scripts and tests.
- Fastify types are confined to HTTP/plugins/bootstrap/tests.
- Repositories expose use-case-aligned operations and do not return HTTP DTOs.
- Transactions are coordinated through application-facing unit-of-work abstractions.
- Shared contracts remain framework-independent Zod schemas.

## Database And Adoption Strategy

Fresh databases use committed Drizzle SQL migrations followed by the idempotent role seed:

```bash
pnpm db:migrate
pnpm db:seed
```

Existing Spring databases must be backed up, verified, then adopted:

```bash
pnpm db:adopt-existing
pnpm db:migrate
pnpm db:seed
```

The adoption script verifies required tables, columns and critical indexes before recording the committed baseline in Drizzle metadata. It does not modify business data. Compatibility that cannot be proven from the repository still requires live inspection:

```sql
SHOW CREATE TABLE users;
SHOW CREATE TABLE roles;
SHOW CREATE TABLE user_roles;
SHOW CREATE TABLE image_data;
SHOW CREATE TABLE exercises;
SHOW CREATE TABLE workouts;
SHOW CREATE TABLE workout_sets;
SHOW CREATE TABLE sets;
```

## Security Improvements

- Signup rejects unexpected privilege fields and assigns only `ROLE_USER`.
- Password hashes never appear in API responses.
- Legacy BCrypt hashes are migrated only after successful login.
- JWT verification populates typed `userId` and roles.
- Role changes, self-delete and final-admin deletion are protected.
- Exercise, image, workout and history queries are scoped by authenticated `userId`.
- Uploads use binary signature detection and reject SVG/GIF/unknown content.
- SQL sort fields are allowlisted.
- Error responses avoid internal SQL/secrets.
- Pino redaction covers authorization, cookies, token/password fields and configured secrets.
- CORS is allowlist-based and Swagger exposure is explicit.

## Date And Time Behavior

Workout API timestamps must include an offset or `Z`. They are converted to UTC, stored as UTC wall-clock values in MySQL `DATETIME`, and serialized as UTC ISO strings with `Z`.

Calendar endpoints use `timezone=<IANA timezone>` or `DEFAULT_TIMEZONE`; no route uses the server timezone. DST and year-boundary behavior is covered in unit/integration tests. Existing legacy rows may need a one-time data audit because Spring `LocalDateTime` values may have been written in the old server timezone.

## Query Performance

- User listing fetches users and roles in grouped queries.
- Workout creation validates referenced exercise IDs set-wise before insertion.
- Workouts-by-date reads use a bounded set of queries and in-memory graph grouping.
- Workout history uses `COUNT(*)`, bounded page queries and a separate set fetch.
- Image deletion checks ownership/reference state inside a transaction.

No production route intentionally issues queries proportional to nested workout groups, sets or exercise count.

## OpenAPI

The generated OpenAPI document is exposed only when `SWAGGER_ENABLED=true`. Tests assert key production paths, Bearer security, binary image retrieval and multipart upload metadata.

## Tests And Coverage Policy

Unit, contract and Fastify inject tests run with:

```bash
pnpm test
```

MySQL integration tests run with:

```bash
pnpm test:integration
```

Coverage thresholds are intentionally non-zero and layer-aware: API coverage requires at least 50% statements/lines and 40% branches/functions; contracts require at least 90% statements/branches/lines and 75% functions.

## CI Behavior

`.github/workflows/ci.yml` uses Node 24, Corepack pnpm 11.5.2, pnpm-store caching, Docker-backed Testcontainers, the full validation command set and a Docker image build. It does not deploy.

## Docker Behavior

The API image builds from `apps/api/Dockerfile`, runs as the non-root `node` user, exposes port `8080`, and relies on Compose for health checks and migration/seed orchestration. The Compose sequence starts MySQL, runs `api-db-init`, then starts the API.

## Known Risks And Deferred Work

- Production schema compatibility must still be verified against the real legacy database with `SHOW CREATE TABLE`.
- Existing workout timestamps may need a data migration if the Spring server stored local wall-clock values.
- API IDs remain JavaScript numbers; revisit string or `bigint` IDs before approaching `Number.MAX_SAFE_INTEGER`.
- Upload storage remains database-backed for compatibility; object storage is outside this rewrite.
- Refresh tokens, token revocation, workout update/delete endpoints and MIME content scanning beyond signature allowlists remain intentionally out of scope.
- Docker image size can be optimized further with a dedicated production dependency deployment strategy once the init-service requirements are stable.
