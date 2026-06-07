import { drizzle } from 'drizzle-orm/mysql2';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import mysql from 'mysql2/promise';
import * as schema from '../../drizzle/schema.js';

// Use ReturnType to capture the exact type drizzle() returns to avoid Pool dual-type conflict
export type Database = ReturnType<typeof drizzle<typeof schema>>;

export interface DatabasePluginOptions {
  client?: {
    db: Database;
    ping: () => Promise<void>;
    close: () => Promise<void>;
  };
}

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
    dbReady: () => Promise<void>;
  }
}

export const dbPlugin = fp(
  async (fastify: FastifyInstance, options: DatabasePluginOptions) => {
    if (options.client) {
      fastify.decorate('db', options.client.db);
      fastify.decorate('dbReady', options.client.ping);
      fastify.addHook('onClose', options.client.close);
      return;
    }

    const env = fastify.config;
    const pool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
    });

    const db = drizzle(pool, { schema, mode: 'default' });
    fastify.decorate('db', db as unknown as Database);
    fastify.decorate('dbReady', async () => {
      await pool.query('SELECT 1');
    });

    fastify.addHook('onClose', async () => {
      await pool.end();
    });
  },
  { name: 'db', dependencies: ['config'] },
);

export function createTestDatabaseClient(
  options: { ping?: () => Promise<void>; close?: () => Promise<void> } = {},
): NonNullable<DatabasePluginOptions['client']> {
  return {
    db: {} as unknown as Database,
    ping: options.ping ?? (async () => {}),
    close: options.close ?? (async () => {}),
  };
}
