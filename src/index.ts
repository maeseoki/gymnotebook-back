import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { type FastifyInstance, fastify } from 'fastify';

import { config } from '@/config/env';
import { authRoutes } from '@/features/auth';
import { exerciseRoutes } from '@/features/exercises';
import { userRoutes } from '@/features/users';
import { workoutRoutes } from '@/features/workouts';
import {
  authenticate,
  registerErrorHandler,
  requireAdmin,
  requireModerator,
} from '@/shared/middleware';
import { createSuccessResponse } from '@/shared/utils';

// Create Fastify instance
const app: FastifyInstance = fastify({
  logger: config.NODE_ENV === 'production' ? true : { level: 'info' },
});

async function buildApp() {
  try {
    // Register CORS
    await app.register(cors, {
      origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(','),
      credentials: true,
    });

    // Register JWT
    await app.register(jwt, {
      secret: config.JWT_SECRET,
      sign: {
        expiresIn: config.JWT_EXPIRES_IN,
      },
    });

    // Register multipart (for file uploads)
    await app.register(multipart);

    // Register rate limiting
    await app.register(rateLimit, {
      max: config.RATE_LIMIT_MAX,
      timeWindow: config.RATE_LIMIT_WINDOW,
    });

    // Register Swagger for API documentation
    await app.register(swagger, {
      swagger: {
        info: {
          title: 'Gym Notebook API',
          description: 'REST API for Gym Notebook application',
          version: '0.1.0',
        },
        host: `localhost:${config.PORT}`,
        schemes: ['http', 'https'],
        consumes: ['application/json'],
        produces: ['application/json'],
        securityDefinitions: {
          bearerAuth: {
            type: 'apiKey',
            name: 'Authorization',
            in: 'header',
            description: 'Enter: Bearer <token>',
          },
        },
      },
    });

    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
    });

    // Register error handler
    registerErrorHandler(app);

    // Health check endpoint
    app.get('/health', async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: config.NODE_ENV,
      };
    });

    // Register route modules
    await app.register(authRoutes, { prefix: '/api/auth' });
    await app.register(userRoutes, { prefix: '/api/user' });
    await app.register(exerciseRoutes, { prefix: '/api/exercise' });
    await app.register(workoutRoutes, { prefix: '/api/workout' });

    // Test routes (similar to the original TestController)
    app.get('/api/test/all', async () => {
      return { message: 'Public Content.' };
    });

    app.get('/api/test/user', { preHandler: [authenticate] }, async () => {
      return { message: 'User Content.' };
    });

    app.get('/api/test/mod', { preHandler: [authenticate, requireModerator()] }, async () => {
      return { message: 'Moderator Board.' };
    });

    app.get('/api/test/admin', { preHandler: [authenticate, requireAdmin()] }, async (request) => {
      return { message: `Admin Board for: ${request.user!.username}` };
    });

    app.get('/api/test/me', { preHandler: [authenticate] }, async (request) => {
      return createSuccessResponse(request.user);
    });

    return app;
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

async function start() {
  try {
    const server = await buildApp();

    await server.listen({
      port: config.PORT,
      host: '0.0.0.0',
    });

    console.log(`🚀 Server running on http://localhost:${config.PORT}`);
    console.log(`📚 API Documentation: http://localhost:${config.PORT}/docs`);
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Start the server
if (import.meta.main) {
  start();
}

export { buildApp };
