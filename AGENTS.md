# AGENTS.md

## Project

TheGymNotebook is a simple gym notebook app.

Core product principle: keep the app simple. Users create their own exercises, name them as they want, and register the weight/reps/series they perform by exercise and day.

The repository is a TypeScript monorepo with:

* `apps/api`: Fastify API.
* `apps/mobile`: Expo React Native app.
* `packages/contracts`: shared Zod contracts and TypeScript types.
* `legacy/backend-java`: old Java/Spring backend reference.
* `legacy/frontend-vite`: old Vite/React frontend reference.

## General rules

* Do not commit automatically.
* Do not add product features outside the requested scope.
* Do not rewrite foundations unless a real blocker requires it.
* Prefer small, focused changes.
* Keep existing architecture and naming conventions.
* Use shared contracts from `@gymnotebook/contracts`; do not duplicate API types.
* Do not invent backend endpoints. Inspect the API routes and integration tests first.
* Do not weaken validation, linting, typing, environment checks, or tests to make a task pass.
* Do not hide test problems with `--forceExit`, broad mocks, disabled rules, or global console suppression.
* Do not log tokens, credentials, refresh tokens, access tokens, or user-sensitive data.
* Do not introduce `any`, `@ts-ignore`, `eslint-disable`, `biome-ignore`, or unsafe casts unless explicitly justified in the completion report.

## Backend rules

* API code lives under `apps/api`.
* Use Fastify, TypeScript, Drizzle, and existing domain/application/infrastructure boundaries.
* Use Zod contracts from `packages/contracts` for request/response validation where applicable.
* Keep use cases testable and independent from HTTP details.
* Preserve existing authentication behavior unless the task explicitly changes auth.
* Database changes require Drizzle migrations and tracked migration metadata.
* If a DB change is made, run and report `pnpm db:check`.

## Mobile rules

* Mobile code lives under `apps/mobile`.
* Use Expo Router for navigation.
* Use TanStack Query for server state.
* Use Zustand only for local app/session state.
* Use React Hook Form + Zod for forms.
* Use Expo SecureStore for refresh tokens.
* Keep access tokens in memory only.
* Do not use AsyncStorage for auth.
* Do not add a global refresh interceptor unless explicitly requested.
* Do not add large UI libraries.
* Do not import navigation APIs directly from `@react-navigation/*`.
* Do not weaken Expo environment validation.
* Real app commands such as `start`, `android`, `ios`, and `web` must require real environment variables.
* Diagnostic commands may inject deterministic test env values.

## Tests

* Add meaningful tests for new behavior.
* Tests must not require a live backend.
* Tests must pass with the normal repository commands.
* Do not use `jest --forceExit`.
* Do not globally silence `console.error` or `console.warn`.
* Fix noisy React/RN warnings instead of masking them.
* Ensure rendered trees are unmounted and QueryClient instances are cleared when needed.
* Prefer testing user-visible behavior over implementation details.

## Validation

Before reporting completion, run the relevant subset and explain any skipped command.

For most tasks, run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm check
```

For API changes, also run:

```bash
pnpm test:integration
docker build -f apps/api/Dockerfile .
```

For mobile changes, also run:

```bash
pnpm --filter @gymnotebook/mobile lint
pnpm --filter @gymnotebook/mobile typecheck
pnpm --filter @gymnotebook/mobile test
pnpm --filter @gymnotebook/mobile export
pnpm --filter @gymnotebook/mobile expo:config
pnpm --filter @gymnotebook/mobile expo:install-check
```

If `expo:doctor` is run and only external network-backed checks fail, report that explicitly. Do not treat local config/export/install-check failures as external.

## Completion report

Every task must end with a full completion report covering the whole task, not only the last edit.

Include:

1. Files changed.
2. Main behavior implemented.
3. Architecture decisions.
4. Tests added or updated.
5. Exact validation commands and results.
6. Known limitations.
7. Whether the work is ready to commit.
8. Confirmation that no commit was made.

## When unsure

Stop and report the ambiguity instead of guessing.
