# Persistence Foundation

This document records the compatibility decisions for the Fastify/Drizzle MySQL persistence layer.

## Legacy Schema Inventory

The Java entities under `src/main/java` are the primary repository source. Exact generated DDL still depends on Hibernate/MySQL settings and the deployed database. For production adoption, verify with `SHOW CREATE TABLE table_name`.

| Table | Repository findings | Final Drizzle decision |
| --- | --- | --- |
| `users` | `Long id` identity; `username`, `email`, `password`; unique constraints on username and email; many-to-many `user_roles`. Bean validation declares max lengths 20, 50, 120. | `BIGINT` numeric id, varchar lengths 20/50/120, unique username/email. |
| `roles` | `Integer id` identity; `name` is `ERole` with `EnumType.STRING` and `@Column(length = 20)`. No Java unique annotation. | `INT` id, `VARCHAR(20)` name, unique name added for deterministic idempotent seeding. |
| `user_roles` | Join table explicitly named `user_roles` with `user_id` and `role_id`. | Composite primary key, FK to users cascades on user delete, FK to roles restricts role delete, index on `role_id`. |
| `image_data` | `Long id`; `name`; `type`; `image_data MEDIUMBLOB NOT NULL`; no owner in legacy model. | Legacy baseline keeps the same columns. Post-baseline adds nullable `user_id` with FK to `users` and an index. |
| `exercises` | `Long id`; string `name`; nullable `description`; `EnumType.STRING` exercise type and muscle groups; optional one-to-one image; required `@JoinColumn(name = "user_id", nullable = false)`. | Varchar-backed enum values, nullable image/description/secondary muscle group, required `user_id`, query indexes for user and image. |
| `workouts` | `Long id`; string `uuid`; `User user` with no explicit join column; nullable-looking `startDate`, `endDate`, `notes`; native query filters by `user_id` and `start_date`. | `uuid` stored as varchar and made unique post-baseline; `user_id`, `start_date`, `end_date`, `notes` remain nullable for legacy compatibility; composite index on `user_id,start_date`. |
| `workout_sets` | `Long id`; explicit `workout_id`; required exercise relation without explicit join column; nullable dates and notes. | Required `workout_id` and `exercise_id`; indexes on both; workout delete cascades, exercise delete restricts. |
| `sets` | `Long id`; primitive numeric fields; nullable notes/start date; primitive `boolean isDropSet`; explicit `@JoinColumn(name = "workoutSet_id")`. | Numeric fields not null; `is_drop_set` column after Hibernate physical naming; required `workout_set_id` FK with cascade and index. |

## Unverified Compatibility

The repository does not prove the deployed MySQL `SHOW CREATE TABLE` output. Verify at least:

- Whether Hibernate created `sets.workoutSet_id` literally or transformed it to `workout_set_id`.
- Whether Java `String` fields without `@Column(length = ...)` are `VARCHAR(255)` in production.
- Whether primitive booleans are stored as `BIT(1)`, `TINYINT(1)`, or another MySQL-compatible boolean type.
- Whether the native query's `Workouts` table casing ever worked on a case-sensitive MySQL filesystem.
- Whether legacy foreign keys include database-level cascade rules or relied only on JPA cascades.

## Migrations

- `0000_legacy_baseline.sql`: creates the legacy-compatible table surface for fresh databases.
- `0001_persistence_foundation.sql`: adds deliberate persistence improvements: role name uniqueness, workout UUID uniqueness, indexes, FK delete rules, boolean normalization, and nullable image ownership.

The image ownership migration backfills `image_data.user_id` only when exactly one exercise owner can be inferred. Ambiguous or unreferenced images remain `NULL`; later image authorization work must report or resolve them before considering a non-null constraint.

## Existing Database Adoption

Required procedure:

```bash
pnpm db:adopt-existing
pnpm db:migrate
pnpm db:seed
```

`db:adopt-existing` refuses missing required legacy tables, required columns, or unique indexes on `users.username` and `users.email`. If it passes, it records only the committed baseline in `__drizzle_migrations`. The normal migration command then applies post-baseline changes.

Back up the database first. If verification fails, inspect the live schema with `SHOW CREATE TABLE` and update the compatibility plan before modifying metadata.

## ID Precision

Legacy Java uses `Long` for most ids, which maps naturally to MySQL `BIGINT`. The Fastify contracts and existing route code use JavaScript `number`. The schema keeps Drizzle `BIGINT` in `mode: "number"` to avoid an unrelated public API break during this phase.

Compatibility consequence: ids must remain below `Number.MAX_SAFE_INTEGER` at the JavaScript boundary. That is acceptable for the expected GymNotebook scale and auto-increment growth, but a future API version should revisit string or `bigint` ids before operating near that limit.

## Date And Time

Legacy entities use `LocalDateTime`. Drizzle stores these columns as MySQL `datetime` and exposes strings. No timezone conversion is introduced in this phase.

## Testcontainers

`pnpm test:integration` starts a real MySQL container with `@testcontainers/mysql`, applies committed migrations, seeds roles, and verifies constraints, foreign keys, indexes, duplicate rejection, transaction rollback, readiness, and app pool close behavior. Docker must be available.
