import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { createDatabaseClient } from '../src/shared/db.js';
import { parseEnv } from '../src/shared/env.js';

export async function runMigrations(): Promise<void> {
  const client = createDatabaseClient(parseEnv(process.env));
  try {
    await waitForDatabase(client.ping);
    await migrate(client.db, {
      migrationsFolder: findMigrationsFolder(),
    });
  } finally {
    await client.close();
  }
}

async function waitForDatabase(ping: () => Promise<void>): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await ping();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Database did not become ready');
}

function findMigrationsFolder(): string {
  const candidates = [
    new URL('../drizzle/migrations/', import.meta.url),
    new URL('../../drizzle/migrations/', import.meta.url),
  ];
  const match = candidates.find((candidate) => {
    return existsSync(new URL('meta/_journal.json', candidate));
  });
  if (!match) {
    throw new Error('Unable to locate Drizzle migrations metadata');
  }
  return match.pathname;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runMigrations();
}
