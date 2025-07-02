import { authenticate } from '@/shared/middleware';
import { createPaginatedResponse, createSuccessResponse } from '@/shared/utils';
import type { FastifyInstance } from 'fastify';
import {
  type CreateWorkoutRequest,
  type GetWorkoutDaysParams,
  type GetWorkoutsByDateParams,
  type GetWorkoutsQuery,
  type WorkoutParams,
  createWorkoutSchema,
  getWorkoutDaysSchema,
  getWorkoutsByDateSchema,
  getWorkoutsQuerySchema,
  workoutParamsSchema,
} from './schemas';
import { WorkoutService } from './service';

export async function workoutRoutes(fastify: FastifyInstance) {
  const workoutService = new WorkoutService();

  // Get workouts for the authenticated user
  fastify.get<{ Querystring: GetWorkoutsQuery }>(
    '/',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const validation = getWorkoutsQuerySchema.safeParse(request.query);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
        });
      }

      const userId = request.user!.id;
      const result = await workoutService.getWorkouts(userId, validation.data);
      return reply.send(createPaginatedResponse(result.workouts, result.pagination));
    }
  );

  // Get workout days for a specific month/year
  fastify.get<{ Params: GetWorkoutDaysParams }>(
    '/days/:month/:year',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const validation = getWorkoutDaysSchema.safeParse(request.params);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
        });
      }

      const userId = request.user!.id;
      const days = await workoutService.getWorkoutDays(userId, validation.data);
      return reply.send(createSuccessResponse(days));
    }
  );

  // Get workouts for a specific date
  fastify.get<{ Params: GetWorkoutsByDateParams }>(
    '/workouts/:date',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const validation = getWorkoutsByDateSchema.safeParse(request.params);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
        });
      }

      const userId = request.user!.id;
      const workouts = await workoutService.getWorkoutsByDate(userId, validation.data);
      return reply.send(createSuccessResponse(workouts));
    }
  );

  // Get a specific workout
  fastify.get<{ Params: WorkoutParams }>(
    '/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const validation = workoutParamsSchema.safeParse(request.params);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
        });
      }

      const userId = request.user!.id;
      const workout = await workoutService.getWorkoutById(userId, validation.data.id);
      return reply.send(createSuccessResponse(workout));
    }
  );

  // Create a new workout
  fastify.post<{ Body: CreateWorkoutRequest }>(
    '/',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const validation = createWorkoutSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
        });
      }

      const userId = request.user!.id;
      const workout = await workoutService.createWorkout(userId, validation.data);
      return reply.status(201).send(createSuccessResponse(workout, 'Workout created successfully'));
    }
  );

  // Delete a workout
  fastify.delete<{ Params: WorkoutParams }>(
    '/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const validation = workoutParamsSchema.safeParse(request.params);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
        });
      }

      const userId = request.user!.id;
      const result = await workoutService.deleteWorkout(userId, validation.data.id);
      return reply.send(createSuccessResponse(result));
    }
  );
}
