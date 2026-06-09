import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import { parseEnv } from '../src/shared/env.js';

const REQUIRED_COLUMNS: Record<string, readonly string[]> = {
  users: ['id', 'username', 'email', 'password'],
  roles: ['id', 'name'],
  user_roles: ['user_id', 'role_id'],
  image_data: ['id', 'name', 'type', 'image_data'],
  exercises: [
    'id',
    'name',
    'image_id',
    'description',
    'type',
    'primary_muscle_group',
    'secondary_muscle_group',
    'user_id',
  ],
  workouts: ['id', 'uuid', 'user_id', 'start_date', 'end_date', 'notes'],
  workout_sets: ['id', 'workout_id', 'exercise_id', 'start_date', 'end_date', 'notes'],
  sets: [
    'id',
    'reps',
    'weight',
    'time',
    'distance',
    'notes',
    'is_drop_set',
    'workout_set_id',
    'start_date',
  ],
};

const REQUIRED_UNIQUE_INDEXES: Record<string, readonly string[]> = {
  users: ['username', 'email'],
};

interface ColumnRow extends RowDataPacket {
  tableName: string;
  columnName: string;
}

interface IndexRow extends RowDataPacket {
  tableName: string;
  columnName: string;
}

export async function adoptExistingDatabase(): Promise<void> {
  const env = parseEnv(process.env);
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });

  try {
    await verifyBaselineShape(connection, env.DB_NAME);
    await recordBaselineMigration(connection);
  } finally {
    await connection.end();
  }
}

async function verifyBaselineShape(connection: mysql.Connection, database: string): Promise<void> {
  const [columnRows] = await connection.execute<ColumnRow[]>(
    `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?`,
    [database],
  );

  const columnsByTable = new Map<string, Set<string>>();
  for (const row of columnRows) {
    const columns = columnsByTable.get(row.tableName) ?? new Set<string>();
    columns.add(row.columnName);
    columnsByTable.set(row.tableName, columns);
  }

  const failures: string[] = [];
  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    const actualColumns = columnsByTable.get(table);
    if (!actualColumns) {
      failures.push(`missing table ${table}`);
      continue;
    }

    for (const column of columns) {
      if (!actualColumns.has(column)) {
        failures.push(`missing column ${table}.${column}`);
      }
    }
  }

  const [indexRows] = await connection.execute<IndexRow[]>(
    `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND NON_UNIQUE = 0`,
    [database],
  );
  const uniqueColumnsByTable = new Map<string, Set<string>>();
  for (const row of indexRows) {
    const columns = uniqueColumnsByTable.get(row.tableName) ?? new Set<string>();
    columns.add(row.columnName);
    uniqueColumnsByTable.set(row.tableName, columns);
  }

  for (const [table, columns] of Object.entries(REQUIRED_UNIQUE_INDEXES)) {
    const uniqueColumns = uniqueColumnsByTable.get(table);
    for (const column of columns) {
      if (!uniqueColumns?.has(column)) {
        failures.push(`missing unique index covering ${table}.${column}`);
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Existing database is not compatible with the committed legacy baseline:\n${failures
        .map((failure) => `  - ${failure}`)
        .join('\n')}`,
    );
  }
}

async function recordBaselineMigration(connection: mysql.Connection): Promise<void> {
  const migrationsFolder = fileURLToPath(new URL('../drizzle/migrations', import.meta.url));
  const [baseline] = readMigrationFiles({ migrationsFolder });
  if (!baseline) {
    throw new Error('No committed baseline migration was found');
  }

  const baselineFile = new URL(`../drizzle/migrations/${baselineTag()}.sql`, import.meta.url);
  const baselineHash = createHash('sha256')
    .update(await readFile(baselineFile))
    .digest('hex');
  if (baselineHash !== baseline.hash) {
    throw new Error('Committed baseline migration hash does not match Drizzle metadata');
  }

  await connection.execute(
    'CREATE TABLE IF NOT EXISTS `__drizzle_migrations` (`id` serial PRIMARY KEY, `hash` text NOT NULL, `created_at` bigint)',
  );
  const [rows] = await connection.execute<RowDataPacket[]>(
    'SELECT `id` FROM `__drizzle_migrations` WHERE `hash` = ? LIMIT 1',
    [baseline.hash],
  );
  if (rows.length > 0) {
    return;
  }

  await connection.execute(
    'INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)',
    [baseline.hash, baseline.folderMillis],
  );
}

function baselineTag(): string {
  return '0000_legacy_baseline';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await adoptExistingDatabase();
}
