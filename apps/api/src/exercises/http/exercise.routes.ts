import {
  CreateExerciseRequestSchema,
  ExerciseResponseSchema,
  UpdateExerciseRequestSchema,
} from '@gymnotebook/contracts';
import type { FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ResourceNotFoundError, UnauthorizedError } from '../../shared/errors.js';
import { DrizzleExerciseRepository } from '../infrastructure/drizzle-exercise.repository.js';

const ExerciseIdParam = z.object({ id: z.coerce.number().int().positive() });

export async function exerciseRoutes(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // GET /api/exercise
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        response: { 200: z.array(ExerciseResponseSchema) },
      },
    },
    async (request, reply) => {
      const jwtUser = request.user as { sub: string; id?: number; userId?: number };
      const exerciseRepo = new DrizzleExerciseRepository(fastify.db);

      // Get user id from token - we need the numeric id
      const { DrizzleUserRepository } = await import(
        '../../users/infrastructure/drizzle-user.repository.js'
      );
      const userRepo = new DrizzleUserRepository(fastify.db);
      const user = await userRepo.findByUsername(jwtUser.sub);
      if (!user) return (reply as any).status(404).send({ message: 'User not found' });

      const exercises = await exerciseRepo.findByUserId(user.id);
      return reply.send(exercises);
    },
  );

  // GET /api/exercise/:id
  fastify.get(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: ExerciseIdParam,
        response: { 200: ExerciseResponseSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const jwtUser = request.user as { sub: string };
      const exerciseRepo = new DrizzleExerciseRepository(fastify.db);

      const exists = await exerciseRepo.existsById(id);
      if (!exists) return (reply as any).status(404).send({ message: 'Exercise not found' });

      const { DrizzleUserRepository } = await import(
        '../../users/infrastructure/drizzle-user.repository.js'
      );
      const userRepo = new DrizzleUserRepository(fastify.db);
      const user = await userRepo.findByUsername(jwtUser.sub);
      if (!user) return (reply as any).status(404).send({ message: 'User not found' });

      const exercise = await exerciseRepo.findById(id);
      if (!exercise) return (reply as any).status(404).send({ message: 'Exercise not found' });

      if (exercise.userId !== user.id) {
        return (reply as any).status(401).send({ message: 'Unauthorized' });
      }

      return reply.send(exercise);
    },
  );

  // POST /api/exercise
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: CreateExerciseRequestSchema,
      },
    },
    async (request, reply) => {
      const jwtUser = request.user as { sub: string };
      const exerciseRepo = new DrizzleExerciseRepository(fastify.db);
      const body = request.body as z.infer<typeof CreateExerciseRequestSchema>;

      const { DrizzleUserRepository } = await import(
        '../../users/infrastructure/drizzle-user.repository.js'
      );
      const userRepo = new DrizzleUserRepository(fastify.db);
      const user = await userRepo.findByUsername(jwtUser.sub);
      if (!user) return (reply as any).status(404).send({ message: 'User not found' });

      await exerciseRepo.create({
        name: body.name,
        description: body.description,
        imageId: body.imageId,
        type: body.type,
        primaryMuscleGroup: body.primaryMuscleGroup,
        secondaryMuscleGroup: body.secondaryMuscleGroup,
        userId: user.id,
      });

      return reply.status(201).send();
    },
  );

  // PUT /api/exercise/:id
  fastify.put(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: ExerciseIdParam,
        body: UpdateExerciseRequestSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const jwtUser = request.user as { sub: string };
      const exerciseRepo = new DrizzleExerciseRepository(fastify.db);
      const body = request.body as z.infer<typeof UpdateExerciseRequestSchema>;

      const { DrizzleUserRepository } = await import(
        '../../users/infrastructure/drizzle-user.repository.js'
      );
      const userRepo = new DrizzleUserRepository(fastify.db);
      const user = await userRepo.findByUsername(jwtUser.sub);
      if (!user) return (reply as any).status(404).send({ message: 'User not found' });

      const exercise = await exerciseRepo.findById(id);
      if (!exercise) return (reply as any).status(404).send({ message: 'Exercise not found' });

      if (exercise.userId !== user.id) {
        return (reply as any).status(401).send({ message: 'Unauthorized' });
      }

      await exerciseRepo.update(id, {
        name: body.name,
        description: body.description,
        imageId: body.imageId,
        type: body.type,
        primaryMuscleGroup: body.primaryMuscleGroup,
        secondaryMuscleGroup: body.secondaryMuscleGroup,
      });

      return reply.status(201).send();
    },
  );

  // DELETE /api/exercise/:id
  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: ExerciseIdParam,
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const jwtUser = request.user as { sub: string };
      const exerciseRepo = new DrizzleExerciseRepository(fastify.db);

      const { DrizzleUserRepository } = await import(
        '../../users/infrastructure/drizzle-user.repository.js'
      );
      const userRepo = new DrizzleUserRepository(fastify.db);
      const user = await userRepo.findByUsername(jwtUser.sub);
      if (!user) return (reply as any).status(404).send({ message: 'User not found' });

      const exercise = await exerciseRepo.findById(id);
      if (!exercise) return (reply as any).status(404).send({ message: 'Exercise not found' });

      if (exercise.userId !== user.id) {
        return (reply as any).status(401).send({ message: 'Unauthorized' });
      }

      await exerciseRepo.delete(id);
      return reply.status(204).send();
    },
  );
}
