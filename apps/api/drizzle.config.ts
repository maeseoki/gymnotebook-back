import type { Config } from 'drizzle-kit';
import { parseEnv } from './src/shared/env.js';

const env = parseEnv(process.env);

export default {
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'mysql',
  dbCredentials: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  },
} satisfies Config;
