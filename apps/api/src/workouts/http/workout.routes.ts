import {
  CreateWorkoutRequestSchema,
  DeleteWorkoutResponseSchema,
  DeleteWorkoutSetResponseSchema,
  ErrorResponseSchema,
  UpdateWorkoutSetRequestSchema,
  UpdateWorkoutSetResponseSchema,
  WorkoutDateParamSchema,
  WorkoutDaysParamSchema,
  WorkoutResponseSchema,
  WorkoutTimezoneQuerySchema,
} from '@gymnotebook/contracts'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { isUniqueConstraintError } from '../../shared/persistence-errors.js'
import { createWorkout } from '../application/create-workout.js'
import { deleteWorkout } from '../application/delete-workout.js'
import { deleteWorkoutSet } from '../application/delete-workout-set.js'
import { getWorkoutsByDate } from '../application/get-workouts-by-date.js'
import { listWorkoutDays } from '../application/list-workout-days.js'
import { updateWorkoutSet } from '../application/update-workout-set.js'
import { DrizzleWorkoutRepository } from '../infrastructure/drizzle-workout.repository.js'
import { DrizzleWorkoutExerciseAccess } from '../infrastructure/drizzle-workout-exercise-access.js'
import { toWorkoutResponse } from './workout.mapper.js'

export async function workoutRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()
  const workoutRepository = new DrizzleWorkoutRepository(fastify.db)
  const exerciseAccess = new DrizzleWorkoutExerciseAccess(fastify.db)

  app.post(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['workouts'],
        summary: 'Create workout',
        description:
          'Creates one workout graph atomically. API timestamps must include an offset or Z and are stored as UTC DATETIME values.',
        security: [{ bearerAuth: [] }],
        body: CreateWorkoutRequestSchema,
        response: {
          201: z.null(),
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await createWorkout(
        { ...request.body, userId: request.user.userId },
        {
          workouts: workoutRepository,
          exerciseAccess,
          isDuplicateWorkoutUuidError: (error) =>
            isUniqueConstraintError(error, ['workouts_uuid_unique', 'uuid']),
        },
      )
      return reply.status(201).send(null)
    },
  )

  app.get(
    '/days/:month/:year',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['workouts'],
        summary: 'List workout days',
        description:
          'Returns local calendar day numbers with workouts for the requested month/year. Uses query timezone or DEFAULT_TIMEZONE.',
        security: [{ bearerAuth: [] }],
        params: WorkoutDaysParamSchema,
        querystring: WorkoutTimezoneQuerySchema,
        response: {
          200: z.array(z.number().int().min(1).max(31)),
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const days = await listWorkoutDays(
        {
          userId: request.user.userId,
          month: request.params.month,
          year: request.params.year,
          timezone: request.query.timezone ?? fastify.config.DEFAULT_TIMEZONE,
        },
        workoutRepository,
      )
      return reply.send(days)
    },
  )

  app.get(
    '/workouts/:date',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['workouts'],
        summary: 'Get workouts by local date',
        description:
          'Returns workouts for one local calendar date. Uses a half-open UTC range derived from query timezone or DEFAULT_TIMEZONE.',
        security: [{ bearerAuth: [] }],
        params: WorkoutDateParamSchema,
        querystring: WorkoutTimezoneQuerySchema,
        response: {
          200: z.array(WorkoutResponseSchema),
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const workouts = await getWorkoutsByDate(
        {
          userId: request.user.userId,
          date: request.params.date,
          timezone: request.query.timezone ?? fastify.config.DEFAULT_TIMEZONE,
        },
        workoutRepository,
      )
      return reply.send(workouts.map(toWorkoutResponse))
    },
  )

  app.delete(
    '/:workoutId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['workouts'],
        summary: 'Delete workout',
        description: 'Deletes a workout and cascades its workout sets and sets.',
        security: [{ bearerAuth: [] }],
        params: z.strictObject({
          workoutId: z.coerce.number().int().positive(),
        }),
        response: {
          204: DeleteWorkoutResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await deleteWorkout(
        { workoutId: request.params.workoutId, userId: request.user.userId },
        workoutRepository,
      )
      return reply.status(204).send(null)
    },
  )

  app.patch(
    '/sets/:setId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['workouts'],
        summary: 'Update workout set',
        description:
          'Updates reps, weight, time, distance, notes, dropSet status, or date of a set.',
        security: [{ bearerAuth: [] }],
        params: z.strictObject({
          setId: z.coerce.number().int().positive(),
        }),
        body: UpdateWorkoutSetRequestSchema,
        response: {
          200: UpdateWorkoutSetResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const updated = await updateWorkoutSet(
        {
          ...request.body,
          setId: request.params.setId,
          userId: request.user.userId,
        },
        workoutRepository,
      )
      return reply.send({
        id: updated.id,
        reps: updated.reps,
        weight: updated.weight,
        time: updated.time,
        distance: updated.distance,
        notes: updated.notes,
        isDropSet: updated.isDropSet,
        startDate: updated.startDate,
      })
    },
  )

  app.delete(
    '/sets/:setId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['workouts'],
        summary: 'Delete workout set',
        description: 'Deletes an individual set, and cleans up empty parents.',
        security: [{ bearerAuth: [] }],
        params: z.strictObject({
          setId: z.coerce.number().int().positive(),
        }),
        response: {
          204: DeleteWorkoutSetResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await deleteWorkoutSet(
        { setId: request.params.setId, userId: request.user.userId },
        workoutRepository,
      )
      return reply.status(204).send(null)
    },
  )
}
