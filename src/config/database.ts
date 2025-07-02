import * as schema from '@/database/schemas';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from './env';

// Create the postgres client
const client = postgres({
  host: config.POSTGRES_HOST,
  port: config.POSTGRES_PORT,
  database: config.POSTGRES_DB,
  username: config.POSTGRES_USER,
  password: config.POSTGRES_PASSWORD,
  ssl: config.POSTGRES_SSL,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create the drizzle database instance
export const db = drizzle(client, { schema });

export type Database = typeof db;
