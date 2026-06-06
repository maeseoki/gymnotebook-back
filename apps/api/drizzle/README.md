# Database Migrations

## Fresh Installation

Run all migrations to create the schema from scratch:

```bash
pnpm db:migrate
```

Then seed the roles table:

```sql
INSERT INTO roles (name) VALUES ('ROLE_USER'), ('ROLE_MODERATOR'), ('ROLE_ADMIN')
ON DUPLICATE KEY UPDATE name = VALUES(name);
```

## Existing Database (Baseline Strategy)

If you have an existing Spring Boot database, the current schema is already in place.
To mark it as already having the baseline migration applied, create the drizzle migrations
metadata table and insert the baseline migration hash:

```sql
CREATE TABLE IF NOT EXISTS `__drizzle_migrations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `hash` VARCHAR(255) NOT NULL,
  `created_at` BIGINT
);
```

Then run `pnpm db:generate` to generate the migration files and record the baseline.

## Future Migrations

All future schema changes must be generated via:

```bash
pnpm db:generate
pnpm db:migrate
```

Never use `drizzle-kit push` in production.
