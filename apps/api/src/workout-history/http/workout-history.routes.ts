import { WorkoutHistoryPageSchema } from '@gymnotebook/contracts';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as schema from '../../../drizzle/schema.js';
import { DrizzleExerciseRepository } from '../../exercises/infrastructure/drizzle-exercise.repository.js';
import { DrizzleUserRepository } from '../../users/infrastructure/drizzle-user.repository.js';

export async function workoutHistoryRoutes(fastify: FastifyInstance) {
  // GET /api/workout-sets/exercise/:exerciseId
  fastify.get(
    '/exercise/:exerciseId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: z.object({ exerciseId: z.coerce.number().int().positive() }),
        querystring: z.object({
          page: z.coerce.number().int().min(0).default(0),
          size: z.coerce.number().int().min(1).max(100).default(20),
          sort: z.string().optional(),
        }),
        response: { 200: WorkoutHistoryPageSchema },
      },
    },
    async (request, reply) => {
      const jwtUser = request.user as { sub: string };
      const { exerciseId } = request.params as { exerciseId: number };
      const { page, size } = request.query as { page: number; size: number };

      const userRepo = new DrizzleUserRepository(fastify.db);
      const user = await userRepo.findByUsername(jwtUser.sub);
      if (!user) return (reply as any).status(404).send({ message: 'User not found' });

      const exerciseRepo = new DrizzleExerciseRepository(fastify.db);
      const exercise = await exerciseRepo.findByIdAndUserId(exerciseId, user.id);
      if (!exercise) {
        return (reply as any)
          .status(404)
          .send({ message: 'Exercise not found or not owned by user' });
      }

      // Count total
      const allRows = await fastify.db
        .select({ id: schema.workoutSets.id })
        .from(schema.workoutSets)
        .where(eq(schema.workoutSets.exerciseId, exerciseId));
      const totalElements = allRows.length;
      const totalPages = Math.ceil(totalElements / size);

      // Paginated fetch
      const workoutSetRows = await fastify.db
        .select()
        .from(schema.workoutSets)
        .where(eq(schema.workoutSets.exerciseId, exerciseId))
        .limit(size)
        .offset(page * size);

      const content = [];
      for (const ws of workoutSetRows) {
        const setRows = await fastify.db
          .select()
          .from(schema.sets)
          .where(eq(schema.sets.workoutSetId, ws.id));

        content.push({
          id: ws.id,
          startDate: ws.startDate,
          endDate: ws.endDate,
          notes: ws.notes,
          exercise: {
            id: exercise.id,
            name: exercise.name,
            description: exercise.description,
            imageId: exercise.imageId,
            type: exercise.type,
            primaryMuscleGroup: exercise.primaryMuscleGroup,
            secondaryMuscleGroup: exercise.secondaryMuscleGroup,
          },
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

      return reply.send({
        content,
        totalElements,
        totalPages,
        page,
        size,
      });
    },
  );
}
