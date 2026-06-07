import {
  CreateExerciseRequestSchema,
  ErrorResponseSchema,
  ExerciseResponseSchema,
  IdParamSchema,
  UpdateExerciseRequestSchema,
} from '@gymnotebook/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { isForeignKeyConstraintError } from '../../shared/persistence-errors.js';
import { createExercise } from '../application/create-exercise.js';
import { deleteExercise } from '../application/delete-exercise.js';
import { getExercise } from '../application/get-exercise.js';
import { listExercises } from '../application/list-exercises.js';
import { updateExercise } from '../application/update-exercise.js';
import { DrizzleExerciseRepository } from '../infrastructure/drizzle-exercise.repository.js';
import { DrizzleExerciseImageAccess } from '../infrastructure/drizzle-exercise-image-access.js';
import { toExerciseResponse } from './exercise.mapper.js';

export async function exerciseRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const exerciseRepository = new DrizzleExerciseRepository(fastify.db);
  const imageAccess = new DrizzleExerciseImageAccess(fastify.db);

  app.get(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['exercises'],
        summary: 'List exercises',
        description: 'Lists exercises owned by the authenticated user.',
        security: [{ bearerAuth: [] }],
        response: {
          200: z.array(ExerciseResponseSchema),
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const exercises = await listExercises({ userId: request.user.userId }, exerciseRepository);
      return reply.send(exercises.map(toExerciseResponse));
    },
  );

  app.get(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['exercises'],
        summary: 'Get exercise',
        description: 'Returns one exercise owned by the authenticated user.',
        security: [{ bearerAuth: [] }],
        params: IdParamSchema,
        response: {
          200: ExerciseResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const exercise = await getExercise(
        { id: request.params.id, userId: request.user.userId },
        exerciseRepository,
      );
      return reply.send(toExerciseResponse(exercise));
    },
  );

  app.post(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['exercises'],
        summary: 'Create exercise',
        description: 'Creates an exercise for the authenticated user.',
        security: [{ bearerAuth: [] }],
        body: CreateExerciseRequestSchema,
        response: {
          201: ExerciseResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const exercise = await createExercise(
        { ...request.body, userId: request.user.userId },
        { exercises: exerciseRepository, imageAccess },
      );
      return reply.status(201).send(toExerciseResponse(exercise));
    },
  );

  app.put(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['exercises'],
        summary: 'Update exercise',
        description: 'Updates an exercise owned by the authenticated user.',
        security: [{ bearerAuth: [] }],
        params: IdParamSchema,
        body: UpdateExerciseRequestSchema,
        response: {
          200: ExerciseResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const exercise = await updateExercise(
        { ...request.body, id: request.params.id, userId: request.user.userId },
        { exercises: exerciseRepository, imageAccess },
      );
      return reply.send(toExerciseResponse(exercise));
    },
  );

  app.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['exercises'],
        summary: 'Delete exercise',
        description:
          'Deletes an exercise owned by the authenticated user unless workout history references it.',
        security: [{ bearerAuth: [] }],
        params: IdParamSchema,
        response: {
          204: z.null(),
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await deleteExercise(
        { id: request.params.id, userId: request.user.userId },
        {
          exercises: exerciseRepository,
          isExerciseInUseError: (error) =>
            isForeignKeyConstraintError(error, [
              'workout_sets_exercise_id_exercises_id_fk',
              'exercise_id',
            ]),
        },
      );
      return reply.status(204).send(null);
    },
  );
}
