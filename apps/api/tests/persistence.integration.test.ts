import { fileURLToPath } from 'node:url';
import { MySqlContainer, type StartedMySqlContainer } from '@testcontainers/mysql';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import type { FastifyInstance } from 'fastify';
import mysql, { type Connection, type RowDataPacket } from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as schema from '../drizzle/schema.js';
import { seedRoles } from '../scripts/seed-roles.js';
import { buildApp, createTestConfig } from '../src/app.js';
import { createDatabaseClient, type DatabaseClient } from '../src/shared/db.js';
import type { Env } from '../src/shared/env.js';
import { inTransaction } from '../src/shared/transaction.js';

interface CountRow extends RowDataPacket {
  count: number;
}

interface NameRow extends RowDataPacket {
  name: string;
}

let container: StartedMySqlContainer | undefined;
let client: DatabaseClient | undefined;
let connection: Connection | undefined;
let config: Env | undefined;
let app: FastifyInstance | undefined;

beforeAll(async () => {
  container = await new MySqlContainer('mysql:8.4')
    .withDatabase('gymnotebook_test')
    .withUsername('gymnotebook')
    .withUserPassword('gymnotebook')
    .withRootPassword('root')
    .start();

  config = createTestConfig({
    DB_HOST: container.getHost(),
    DB_PORT: container.getPort(),
    DB_NAME: container.getDatabase(),
    DB_USER: container.getUsername(),
    DB_PASSWORD: container.getUserPassword(),
  });
  client = createDatabaseClient(config);
  connection = await mysql.createConnection({
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
  });

  await migrate(client.db, {
    migrationsFolder: fileURLToPath(new URL('../drizzle/migrations', import.meta.url)),
  });
  await seedRoles(client.db);
});

afterAll(async () => {
  await app?.close();
  await connection?.end();
  await client?.close();
  await container?.stop();
});

describe('persistence foundation', () => {
  it('applies all committed migrations to an empty database', async () => {
    const rows = await query<CountRow>(
      'SELECT COUNT(*) AS count FROM `__drizzle_migrations` WHERE `hash` IS NOT NULL',
    );

    expect(rows[0]?.count).toBe(3);
  });

  it('creates all expected tables', async () => {
    const rows = await query<NameRow>(
      `SELECT TABLE_NAME AS name
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()`,
    );

    expect(rows.map((row) => row.name).sort()).toEqual([
      '__drizzle_migrations',
      'exercises',
      'image_data',
      'mobile_sessions',
      'roles',
      'sets',
      'user_roles',
      'users',
      'workout_sets',
      'workouts',
    ]);
  });

  it('creates required unique constraints', async () => {
    await expectUniqueColumn('users', 'username');
    await expectUniqueColumn('users', 'email');
    await expectUniqueColumn('roles', 'name');
    await expectUniqueColumn('workouts', 'uuid');
  });

  it('creates required foreign keys and indexes', async () => {
    await expectForeignKey('image_data_user_id_users_id_fk', 'SET NULL');
    await expectForeignKey('exercises_user_id_users_id_fk', 'CASCADE');
    await expectForeignKey('workout_sets_exercise_id_exercises_id_fk', 'RESTRICT');
    await expectForeignKey('sets_workout_set_id_workout_sets_id_fk', 'CASCADE');
    await expectForeignKey('mobile_sessions_user_id_users_id_fk', 'CASCADE');
    await expectForeignKey(
      'mobile_sessions_previous_session_row_id_mobile_sessions_id_fk',
      'RESTRICT',
    );
    await expectForeignKey(
      'mobile_sessions_replaced_by_session_row_id_mobile_sessions_id_fk',
      'SET NULL',
    );
    await expectIndex('mobile_sessions', 'mobile_sessions_refresh_token_hash_unique');
    await expectIndex('mobile_sessions', 'mobile_sessions_token_family_id_idx');
    await expectIndex('mobile_sessions', 'mobile_sessions_expiry_revocation_idx');
    await expectIndex('workouts', 'workouts_user_start_date_idx');
    await expectIndex('workout_sets', 'workout_sets_exercise_id_idx');
    await expectIndex('sets', 'sets_workout_set_id_idx');
  });

  it('seeds mandatory roles idempotently', async () => {
    requireClient();

    await seedRoles(client.db);
    const rows = await query<CountRow>(
      'SELECT COUNT(*) AS count FROM `roles` WHERE `name` IN ("ROLE_USER", "ROLE_MODERATOR", "ROLE_ADMIN")',
    );
    const duplicateRows = await query<CountRow>(
      `SELECT COUNT(*) AS count
       FROM (
         SELECT name
         FROM roles
         GROUP BY name
         HAVING COUNT(*) > 1
       ) AS duplicates`,
    );

    expect(rows[0]?.count).toBe(3);
    expect(duplicateRows[0]?.count).toBe(0);
  });

  it('rejects duplicate usernames and emails in MySQL', async () => {
    requireClient();

    await client.db.insert(schema.users).values({
      username: 'duplicate-user',
      email: 'duplicate@example.test',
      password: 'hashed-password',
    });

    await expect(
      client.db.insert(schema.users).values({
        username: 'duplicate-user',
        email: 'other@example.test',
        password: 'hashed-password',
      }),
    ).rejects.toThrow();
    await expect(
      client.db.insert(schema.users).values({
        username: 'other-duplicate',
        email: 'duplicate@example.test',
        password: 'hashed-password',
      }),
    ).rejects.toThrow();
  });

  it('rejects duplicate workout UUIDs in MySQL', async () => {
    requireClient();
    const userId = await insertUser('workout-uuid-user', 'workout-uuid@example.test');

    await client.db.insert(schema.workouts).values({
      uuid: 'same-workout-uuid',
      userId,
      startDate: '2026-01-01 10:00:00',
      endDate: '2026-01-01 11:00:00',
    });

    await expect(
      client.db.insert(schema.workouts).values({
        uuid: 'same-workout-uuid',
        userId,
        startDate: '2026-01-02 10:00:00',
        endDate: '2026-01-02 11:00:00',
      }),
    ).rejects.toThrow();
  });

  it('enforces configured foreign-key deletion behavior', async () => {
    requireClient();
    const userId = await insertUser('cascade-user', 'cascade@example.test');
    const roleRows = await client.db
      .select()
      .from(schema.roles)
      .where(eq(schema.roles.name, 'ROLE_USER'))
      .limit(1);
    const roleId = roleRows[0]?.id;
    expect(roleId).toBeTypeOf('number');

    await client.db.insert(schema.userRoles).values({ userId, roleId: roleId ?? 0 });
    await client.db.delete(schema.users).where(eq(schema.users.id, userId));
    const rows = await query<CountRow>(
      'SELECT COUNT(*) AS count FROM `user_roles` WHERE `user_id` = ?',
      [userId],
    );

    expect(rows[0]?.count).toBe(0);
  });

  it('rolls back transaction work without partial rows', async () => {
    requireClient();

    await expect(
      inTransaction(client.db, async (tx) => {
        await tx.insert(schema.users).values({
          username: 'rollback-user',
          email: 'rollback@example.test',
          password: 'hashed-password',
        });
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');

    const rows = await query<CountRow>(
      'SELECT COUNT(*) AS count FROM `users` WHERE `username` = ?',
      ['rollback-user'],
    );
    expect(rows[0]?.count).toBe(0);
  });

  it('reports readiness against the container and closes the application pool', async () => {
    config = requireConfig();
    app = await buildApp({ config });

    const response = await app.inject({ method: 'GET', url: '/health/ready' });
    await app.close();
    app = undefined;

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });
  });
});

async function insertUser(username: string, email: string): Promise<number> {
  requireClient();
  const inserted = await client.db
    .insert(schema.users)
    .values({ username, email, password: 'hashed-password' })
    .$returningId();
  const id = inserted[0]?.id;
  if (typeof id !== 'number') {
    throw new Error('Expected inserted user id');
  }
  return id;
}

async function expectUniqueColumn(table: string, column: string): Promise<void> {
  const rows = await query<CountRow>(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
       AND NON_UNIQUE = 0`,
    [table, column],
  );
  expect(rows[0]?.count).toBeGreaterThan(0);
}

async function expectForeignKey(name: string, deleteRule: string): Promise<void> {
  const rows = await query<CountRow>(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND CONSTRAINT_NAME = ?
       AND DELETE_RULE = ?`,
    [name, deleteRule],
  );
  expect(rows[0]?.count).toBe(1);
}

async function expectIndex(table: string, indexName: string): Promise<void> {
  const rows = await query<CountRow>(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    [table, indexName],
  );
  expect(rows[0]?.count).toBeGreaterThan(0);
}

async function query<T extends RowDataPacket>(
  statement: string,
  values: unknown[] = [],
): Promise<T[]> {
  if (!connection) {
    throw new Error('MySQL connection was not initialized');
  }
  const [rows] = await connection.execute<T[]>(statement, values);
  return rows;
}

function requireClient(): asserts client is DatabaseClient {
  if (!client) {
    throw new Error('Database client was not initialized');
  }
}

function requireConfig(): Env {
  if (!config) {
    throw new Error('Test config was not initialized');
  }
  return config;
}
