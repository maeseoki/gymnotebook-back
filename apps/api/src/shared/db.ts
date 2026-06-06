import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import * as schema from '../../drizzle/schema.js';

// Use ReturnType to capture the exact type drizzle() returns to avoid Pool dual-type conflict
type Database = ReturnType<typeof drizzle<typeof schema>>;

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}

export const dbPlugin = fp(
  async (fastify: FastifyInstance) => {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fastify.decorate('db', db as any);

    fastify.addHook('onClose', async () => {
      await pool.end();
    });
  },
  { name: 'db', dependencies: ['config'] },
);
