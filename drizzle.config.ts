import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/database/schemas/*-schema.ts',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT) || 5432,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'password',
    database: process.env.POSTGRES_DB || 'gymnotebook',
    ssl: process.env.POSTGRES_SSL === 'true',
  },
  verbose: true,
  strict: true,
});