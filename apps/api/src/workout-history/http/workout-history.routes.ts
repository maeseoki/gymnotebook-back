import {
  ErrorResponseSchema,
  WorkoutHistoryPageSchema,
  WorkoutHistoryParamSchema,
  WorkoutHistoryQuerySchema,
} from '@gymnotebook/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { getExerciseHistory } from '../application/get-exercise-history.js';
import { DrizzleWorkoutHistoryRepository } from '../infrastructure/drizzle-workout-history.repository.js';
import { toWorkoutHistoryPage } from './workout-history.mapper.js';

export async function workoutHistoryRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const historyRepository = new DrizzleWorkoutHistoryRepository(fastify.db);

  app.get(
    '/exercise/:exerciseId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['workout-history'],
        summary: 'Get exercise workout history',
        description:
          'Returns paginated workout groups for an exercise owned by the authenticated user. Sorting is allowlisted and deterministic.',
        security: [{ bearerAuth: [] }],
        params: WorkoutHistoryParamSchema,
        querystring: WorkoutHistoryQuerySchema,
        response: {
          200: WorkoutHistoryPageSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const page = await getExerciseHistory(
        { ...request.query, exerciseId: request.params.exerciseId, userId: request.user.userId },
        historyRepository,
      );
      return reply.send(toWorkoutHistoryPage(page));
    },
  );
}
