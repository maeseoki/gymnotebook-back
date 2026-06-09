import type { MySql2Database } from 'drizzle-orm/mysql2';
import { drizzle } from 'drizzle-orm/mysql2';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import mysql from 'mysql2/promise';
import * as schema from '../../drizzle/schema.js';
import type { Env } from './env.js';

export type Database = MySql2Database<typeof schema>;

export interface DatabaseClient {
  db: Database;
  ping: () => Promise<void>;
  close: () => Promise<void>;
}

export interface DatabasePluginOptions {
  client?: DatabaseClient;
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

    const client = createDatabaseClient(fastify.config);
    fastify.decorate('db', client.db);
    fastify.decorate('dbReady', client.ping);
    fastify.addHook('onClose', client.close);
  },
  { name: 'db', dependencies: ['config'] },
);

export function createDatabaseClient(env: Env): DatabaseClient {
  const pool = mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });

  return {
    db: drizzle(pool, { schema, mode: 'default' }),
    ping: async () => {
      await pool.query('SELECT 1');
    },
    close: async () => {
      await pool.end();
    },
  };
}

export function createTestDatabaseClient(
  options: { ping?: () => Promise<void>; close?: () => Promise<void> } = {},
): DatabaseClient {
  return {
    db: {} as unknown as Database,
    ping: options.ping ?? (async () => {}),
    close: options.close ?? (async () => {}),
  };
}
