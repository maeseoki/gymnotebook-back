import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyServerOptions } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { authRoutes } from './auth/http/auth.routes.js';
import { exerciseRoutes } from './exercises/http/exercise.routes.js';
import { healthRoutes } from './health/health.routes.js';
import { imageRoutes } from './images/http/image.routes.js';
import { configPlugin } from './shared/config.js';
import { createTestDatabaseClient, type DatabasePluginOptions, dbPlugin } from './shared/db.js';
import type { Env } from './shared/env.js';
import { registerErrorHandlers } from './shared/errors.js';
import { jwtAuthPlugin } from './shared/jwt.js';
import { userRoutes } from './users/http/user.routes.js';
import { workoutHistoryRoutes } from './workout-history/http/workout-history.routes.js';
import { workoutRoutes } from './workouts/http/workout.routes.js';

export interface BuildAppOptions {
  config?: Env;
  configOverrides?: Partial<Env>;
  databaseClient?: DatabasePluginOptions['client'];
}

export async function buildApp(options: BuildAppOptions = {}) {
  const config = options.config ?? createTestConfig(options.configOverrides);
  const fastify = Fastify({
    logger: createLoggerOptions(config),
    disableRequestLogging: false,
  });

  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  registerErrorHandlers(fastify);

  await fastify.register(configPlugin, { config });
  await fastify.register(sensible);
  await fastify.register(cors, {
    origin: (origin, callback) => {
      callback(null, origin === undefined || config.CORS_ORIGINS.includes(origin));
    },
    credentials: true,
    maxAge: 3600,
  });
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
    hsts: config.NODE_ENV === 'production' ? undefined : false,
  });
  await fastify.register(multipart, {
    attachFieldsToBody: false,
    limits: {
      fileSize: config.MAX_UPLOAD_SIZE,
      files: 1,
      fields: 10,
      parts: 20,
    },
  });
  await fastify.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
  });

  if (config.SWAGGER_ENABLED) {
    await fastify.register(swagger, {
      openapi: {
        openapi: '3.1.0',
        info: {
          title: 'GymNotebook API',
          description: 'GymNotebook backend API',
          version: '1.0.0',
        },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      },
      transform: jsonSchemaTransform,
    });

    await fastify.register(swaggerUi, {
      routePrefix: '/docs',
    });
  }

  await fastify.register(dbPlugin, {
    client: options.databaseClient,
  });
  await fastify.register(jwtAuthPlugin);

  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(userRoutes, { prefix: '/api/user' });
  await fastify.register(exerciseRoutes, { prefix: '/api/exercise' });
  await fastify.register(imageRoutes, { prefix: '/api/image' });
  await fastify.register(workoutRoutes, { prefix: '/api/workout' });
  await fastify.register(workoutHistoryRoutes, { prefix: '/api/workout-sets' });
  await fastify.register(healthRoutes);

  await fastify.ready();
  return fastify;
}

export function createTestConfig(overrides: Partial<Env> = {}): Env {
  return {
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: 0,
    DB_HOST: 'localhost',
    DB_PORT: 3306,
    DB_NAME: 'gymnotebook',
    DB_USER: 'gymnotebook',
    DB_PASSWORD: 'gymnotebook',
    JWT_SECRET: 'test-only-jwt-secret-that-is-long-enough',
    JWT_EXPIRATION_MS: 86400000,
    CORS_ORIGINS: ['http://localhost:3000'],
    LOG_LEVEL: 'silent',
    MAX_UPLOAD_SIZE: 10 * 1024 * 1024,
    RATE_LIMIT_MAX: 1000,
    RATE_LIMIT_WINDOW_MS: 60000,
    AUTH_RATE_LIMIT_MAX: 1000,
    AUTH_RATE_LIMIT_WINDOW_MS: 60000,
    SWAGGER_ENABLED: true,
    ...overrides,
  };
}

export function createTestDatabase(options?: Parameters<typeof createTestDatabaseClient>[0]) {
  return createTestDatabaseClient(options);
}

function createLoggerOptions(config: Env): FastifyServerOptions['logger'] {
  const redact = {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'JWT_SECRET',
      'DB_PASSWORD',
    ],
    censor: '[Redacted]',
  };

  if (config.NODE_ENV === 'production' || config.NODE_ENV === 'test') {
    return {
      level: config.LOG_LEVEL,
      redact,
    };
  }

  return {
    level: config.LOG_LEVEL,
    redact,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  };
}
