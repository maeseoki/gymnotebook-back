import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

import { authRoutes } from './auth/http/auth.routes.js';
import { exerciseRoutes } from './exercises/http/exercise.routes.js';
import { healthRoutes } from './health/health.routes.js';
import { imageRoutes } from './images/http/image.routes.js';
import { configPlugin } from './shared/config.js';
import { dbPlugin } from './shared/db.js';
import { jwtAuthPlugin } from './shared/jwt.js';
import { userRoutes } from './users/http/user.routes.js';
import { workoutHistoryRoutes } from './workout-history/http/workout-history.routes.js';
import { workoutRoutes } from './workouts/http/workout.routes.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: process.env['NODE_ENV'] === 'test' ? 'silent' : 'info',
    },
  });

  // Set up Zod type provider
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // Core plugins (order matters)
  await fastify.register(configPlugin);
  await fastify.register(sensible);
  await fastify.register(cors, { origin: '*', maxAge: 3600 });
  await fastify.register(helmet, { contentSecurityPolicy: false });
  await fastify.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });
  await fastify.register(rateLimit, {
    max: Number(process.env['RATE_LIMIT_MAX'] ?? 100),
    timeWindow: Number(process.env['RATE_LIMIT_WINDOW_MS'] ?? 60000),
  });

  await fastify.register(swagger, {
    openapi: {
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
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
  });

  // DB and auth plugins
  await fastify.register(dbPlugin);
  await fastify.register(jwtAuthPlugin);

  // Routes
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(userRoutes, { prefix: '/api/user' });
  await fastify.register(exerciseRoutes, { prefix: '/api/exercise' });
  await fastify.register(imageRoutes, { prefix: '/api/image' });
  await fastify.register(workoutRoutes, { prefix: '/api/workout' });
  await fastify.register(workoutHistoryRoutes, { prefix: '/api/workout-sets' });
  await fastify.register(healthRoutes, { prefix: '/health' });

  return fastify;
}
