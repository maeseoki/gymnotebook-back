import { CreateWorkoutRequestSchema } from '@gymnotebook/contracts';
import { and, between, eq, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as schema from '../../../drizzle/schema.js';
import { ConflictError, ResourceNotFoundError } from '../../shared/errors.js';
import { DrizzleUserRepository } from '../../users/infrastructure/drizzle-user.repository.js';

export async function workoutRoutes(fastify: FastifyInstance) {
  // POST /api/workout
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: CreateWorkoutRequestSchema,
      },
    },
    async (request, reply) => {
      const jwtUser = request.user;
      const body = request.body as z.infer<typeof CreateWorkoutRequestSchema>;

      const userRepo = new DrizzleUserRepository(fastify.db);
      const user = await userRepo.findByUsername(jwtUser.sub);
      if (!user) throw new ResourceNotFoundError('User not found');

      // Check for duplicate UUID
      const existing = await fastify.db
        .select({ id: schema.workouts.id })
        .from(schema.workouts)
        .where(eq(schema.workouts.uuid, body.uuid))
        .limit(1);

      if (existing.length > 0) {
        throw new ConflictError(`Ya existe un workout con el UUID: ${body.uuid}`);
      }

      // Convert ISO datetime strings to local datetime format for MySQL
      const toLocalDatetime = (isoString: string): string => {
        const date = new Date(isoString);
        return date.toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);
      };

      // Create workout
      const workoutResult = await fastify.db.insert(schema.workouts).values({
        uuid: body.uuid,
        userId: user.id,
        startDate: toLocalDatetime(body.startDate),
        endDate: toLocalDatetime(body.endDate),
        notes: body.notes ?? null,
      });
      const workoutId = (workoutResult as unknown as { insertId: number }).insertId;

      // Create workout sets and sets
      for (const wsReq of body.workoutSets) {
        const wsResult = await fastify.db.insert(schema.workoutSets).values({
          workoutId,
          exerciseId: wsReq.exercise.id,
          startDate: wsReq.startDate ? toLocalDatetime(wsReq.startDate) : null,
          endDate: wsReq.endDate ? toLocalDatetime(wsReq.endDate) : null,
          notes: wsReq.notes ?? null,
        });
        const workoutSetId = (wsResult as unknown as { insertId: number }).insertId;

        for (const setReq of wsReq.sets) {
          await fastify.db.insert(schema.sets).values({
            reps: setReq.reps ?? 0,
            weight: setReq.weight ?? 0,
            time: setReq.time ?? 0,
            distance: setReq.distance ?? 0,
            notes: setReq.notes ?? null,
            isDropSet: setReq.isDropSet ?? false,
            workoutSetId,
            startDate: setReq.startDate ? toLocalDatetime(setReq.startDate) : null,
          });
        }
      }

      return reply.status(201).send();
    },
  );

  // GET /api/workout/days/:month/:year
  fastify.get(
    '/days/:month/:year',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: z.object({
          month: z.coerce.number().int().min(1).max(12),
          year: z.coerce.number().int(),
        }),
        response: { 200: z.array(z.number().int()) },
      },
    },
    async (request, reply) => {
      const jwtUser = request.user;
      const { month, year } = request.params as { month: number; year: number };

      const userRepo = new DrizzleUserRepository(fastify.db);
      const user = await userRepo.findByUsername(jwtUser.sub);
      if (!user) throw new ResourceNotFoundError('User not found');

      const rows = await fastify.db.execute(
        sql`SELECT DISTINCT DAY(start_date) as day FROM workouts WHERE user_id = ${user.id} AND MONTH(start_date) = ${month} AND YEAR(start_date) = ${year} ORDER BY day`,
      );

      const dayRows = rows[0] as unknown as Array<{ day: number }>;
      const days = dayRows.map((r) => r.day);
      return reply.send(days);
    },
  );

  // GET /api/workout/workouts/:date
  fastify.get(
    '/workouts/:date',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: z.object({ date: z.string() }),
      },
    },
    async (request, reply) => {
      const jwtUser = request.user;
      const { date } = request.params as { date: string };

      // Parse date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const toLocalDatetime = (d: Date): string =>
        d.toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);

      const userRepo = new DrizzleUserRepository(fastify.db);
      const user = await userRepo.findByUsername(jwtUser.sub);
      if (!user) throw new ResourceNotFoundError('User not found');

      // Fetch workouts with nested data
      const workoutRows = await fastify.db
        .select()
        .from(schema.workouts)
        .where(
          and(
            eq(schema.workouts.userId, user.id),
            between(
              schema.workouts.startDate,
              toLocalDatetime(startOfDay),
              toLocalDatetime(endOfDay),
            ),
          ),
        );

      const result = [];
      for (const workout of workoutRows) {
        const workoutSetRows = await fastify.db
          .select()
          .from(schema.workoutSets)
          .where(eq(schema.workoutSets.workoutId, workout.id));

        const workoutSetsResult = [];
        for (const ws of workoutSetRows) {
          const exerciseRows = await fastify.db
            .select()
            .from(schema.exercises)
            .where(eq(schema.exercises.id, ws.exerciseId))
            .limit(1);

          const setRows = await fastify.db
            .select()
            .from(schema.sets)
            .where(eq(schema.sets.workoutSetId, ws.id));

          workoutSetsResult.push({
            id: ws.id,
            startDate: ws.startDate,
            endDate: ws.endDate,
            notes: ws.notes,
            exercise: exerciseRows[0],
            sets: setRows.map((s) => ({
              id: s.id,
              reps: s.reps,
              weight: s.weight,
              time: s.time,
              distance: s.distance,
              notes: s.notes,
              isDropSet: s.isDropSet,
              startDate: s.startDate,
            })),
          });
        }

        result.push({
          id: workout.id,
          uuid: workout.uuid,
          startDate: workout.startDate,
          endDate: workout.endDate,
          notes: workout.notes,
          workoutSets: workoutSetsResult,
        });
      }

      return reply.send(result);
    },
  );
}
