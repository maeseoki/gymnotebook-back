import { ErrorResponseSchema } from '@gymnotebook/contracts';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError } from '../shared/errors.js';

const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
});

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/health/live',
    {
      schema: {
        response: {
          200: HealthResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      return reply.send({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    },
  );

  fastify.get(
    '/health/ready',
    {
      schema: {
        response: {
          200: HealthResponseSchema,
          503: ErrorResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      try {
        await fastify.dbReady();
      } catch {
        throw new AppError(503, 'service_unavailable', 'Service unavailable');
      }

      return reply.send({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    },
  );
}
