import { z } from 'zod';

const DEFAULT_DEV_JWT_SECRET = 'development-only-jwt-secret-change-before-production';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    HOST: z.string().optional(),
    PORT: z.coerce.number().int().min(1).max(65535).optional(),
    DB_HOST: z.string().optional(),
    DB_PORT: z.coerce.number().int().min(1).max(65535).optional(),
    DB_NAME: z.string().optional(),
    DB_USER: z.string().optional(),
    DB_PASSWORD: z.string().optional(),
    JWT_SECRET: z.string().optional(),
    JWT_EXPIRATION_MS: z.coerce.number().int().positive().optional(),
    CORS_ORIGINS: z.string().optional(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
    MAX_UPLOAD_SIZE: z.coerce.number().int().positive().optional(),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().optional(),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().optional(),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().optional(),
    AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().optional(),
    SWAGGER_ENABLED: z.enum(['true', 'false']).optional(),
  })
  .superRefine((raw, ctx) => {
    if (raw.NODE_ENV !== 'production') {
      return;
    }

    for (const key of [
      'DB_HOST',
      'DB_NAME',
      'DB_USER',
      'DB_PASSWORD',
      'JWT_SECRET',
      'CORS_ORIGINS',
    ] as const) {
      if (!raw[key]) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} is required in production`,
        });
      }
    }

    if (raw.JWT_SECRET && raw.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET must be at least 32 characters in production',
      });
    }

    if (raw.JWT_SECRET === DEFAULT_DEV_JWT_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET must not use the development default in production',
      });
    }
  })
  .transform((raw) => {
    const isProduction = raw.NODE_ENV === 'production';
    const defaultOrigins =
      raw.NODE_ENV === 'test'
        ? ['http://localhost:3000']
        : ['http://localhost:3000', 'http://localhost:5173'];
    const corsOrigins = parseCorsOrigins(raw.CORS_ORIGINS) ?? (isProduction ? [] : defaultOrigins);

    return {
      NODE_ENV: raw.NODE_ENV,
      HOST: raw.HOST ?? '0.0.0.0',
      PORT: raw.PORT ?? 8080,
      DB_HOST: raw.DB_HOST ?? 'localhost',
      DB_PORT: raw.DB_PORT ?? 3306,
      DB_NAME: raw.DB_NAME ?? 'gymnotebook',
      DB_USER: raw.DB_USER ?? 'gymnotebook',
      DB_PASSWORD: raw.DB_PASSWORD ?? 'gymnotebook',
      JWT_SECRET: raw.JWT_SECRET ?? DEFAULT_DEV_JWT_SECRET,
      JWT_EXPIRATION_MS: raw.JWT_EXPIRATION_MS ?? 86400000,
      CORS_ORIGINS: corsOrigins,
      LOG_LEVEL: raw.LOG_LEVEL ?? (raw.NODE_ENV === 'test' ? 'silent' : 'info'),
      MAX_UPLOAD_SIZE: raw.MAX_UPLOAD_SIZE ?? 10 * 1024 * 1024,
      RATE_LIMIT_MAX: raw.RATE_LIMIT_MAX ?? 100,
      RATE_LIMIT_WINDOW_MS: raw.RATE_LIMIT_WINDOW_MS ?? 60000,
      AUTH_RATE_LIMIT_MAX: raw.AUTH_RATE_LIMIT_MAX ?? 10,
      AUTH_RATE_LIMIT_WINDOW_MS: raw.AUTH_RATE_LIMIT_WINDOW_MS ?? 60000,
      SWAGGER_ENABLED: raw.SWAGGER_ENABLED ? raw.SWAGGER_ENABLED === 'true' : !isProduction,
    };
  });

function parseCorsOrigins(value: string | undefined): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return result.data;
}
