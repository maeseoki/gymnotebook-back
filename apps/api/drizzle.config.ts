import type { Config } from 'drizzle-kit';

export default {
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env['DB_HOST'] ?? 'localhost',
    port: Number(process.env['DB_PORT'] ?? '3306'),
    user: process.env['DB_USER'] ?? 'gymnotebook',
    password: process.env['DB_PASSWORD'] ?? 'gymnotebook',
    database: process.env['DB_NAME'] ?? 'gymnotebook',
  },
} satisfies Config;
