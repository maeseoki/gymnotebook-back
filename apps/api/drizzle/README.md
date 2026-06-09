# Database Migrations

This directory contains committed Drizzle migrations for MySQL. Do not use `drizzle-kit push` for production.

## Fresh Installation

From the repository root:

```bash
pnpm db:migrate
pnpm db:seed
```

`pnpm db:migrate` applies the committed SQL files in `drizzle/migrations`. `pnpm db:seed` inserts the mandatory roles idempotently:

- `ROLE_USER`
- `ROLE_MODERATOR`
- `ROLE_ADMIN`

## Existing Spring Boot Database Adoption

Take a verified backup first.

For an existing Spring Boot database, do not run the baseline DDL against tables that already exist. Instead:

```bash
pnpm db:adopt-existing
pnpm db:migrate
pnpm db:seed
```

`db:adopt-existing` verifies the legacy table and column surface, creates Drizzle's `__drizzle_migrations` metadata table if needed, and records the committed `0000_legacy_baseline` migration hash using Drizzle's expected hash format. It does not modify business data.

If verification fails, inspect the database with:

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

After adoption, `pnpm db:migrate` applies post-baseline migrations such as unique workout UUIDs and nullable image ownership.

## Development Commands

```bash
pnpm db:generate
pnpm db:check
pnpm db:studio
```

`db:generate` is for intentional schema changes only. CI should use `db:check` and the integration migration tests to detect drift.
