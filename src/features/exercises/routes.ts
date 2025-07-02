import { authenticate } from '@/shared/middleware';
import { createPaginatedResponse, createSuccessResponse } from '@/shared/utils';
import type { FastifyInstance } from 'fastify';
import {
  type CreateExerciseRequest,
  type ExerciseParams,
  type GetExercisesQuery,
  type UpdateExerciseRequest,
  createExerciseSchema,
  exerciseParamsSchema,
  getExercisesQuerySchema,
  updateExerciseSchema,
} from './schemas';
import { ExerciseService } from './service';

export async function exerciseRoutes(fastify: FastifyInstance) {
  const exerciseService = new ExerciseService();

  // Get exercises for the authenticated user
  fastify.get<{ Querystring: GetExercisesQuery }>(
    '/',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const validation = getExercisesQuerySchema.safeParse(request.query);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
        });
      }

      const userId = request.user!.id;
      const result = await exerciseService.getExercises(userId, validation.data);
      return reply.send(createPaginatedResponse(result.exercises, result.pagination));
    }
  );

  // Get a specific exercise
  fastify.get<{ Params: ExerciseParams }>(
    '/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const validation = exerciseParamsSchema.safeParse(request.params);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
        });
      }

      const userId = request.user!.id;
      const exercise = await exerciseService.getExerciseById(userId, validation.data.id);
      return reply.send(createSuccessResponse(exercise));
    }
  );

  // Create a new exercise
  fastify.post<{ Body: CreateExerciseRequest }>(
    '/',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const validation = createExerciseSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
        });
      }

      const userId = request.user!.id;
      const exercise = await exerciseService.createExercise(userId, validation.data);
      return reply
        .status(201)
        .send(createSuccessResponse(exercise, 'Exercise created successfully'));
    }
  );

  // Update an exercise
  fastify.put<{ Params: ExerciseParams; Body: UpdateExerciseRequest }>(
    '/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const paramsValidation = exerciseParamsSchema.safeParse(request.params);
      if (!paramsValidation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: paramsValidation.error.errors.map(
            (err) => `${err.path.join('.')}: ${err.message}`
          ),
        });
      }

      const bodyValidation = updateExerciseSchema.safeParse(request.body);
      if (!bodyValidation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: bodyValidation.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
        });
      }

      const userId = request.user!.id;
      const exercise = await exerciseService.updateExercise(
        userId,
        paramsValidation.data.id,
        bodyValidation.data
      );
      return reply.send(createSuccessResponse(exercise, 'Exercise updated successfully'));
    }
  );

  // Delete an exercise
  fastify.delete<{ Params: ExerciseParams }>(
    '/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const validation = exerciseParamsSchema.safeParse(request.params);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
        });
      }

      const userId = request.user!.id;
      const result = await exerciseService.deleteExercise(userId, validation.data.id);
      return reply.send(createSuccessResponse(result));
    }
  );
}
