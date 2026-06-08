import {
  ErrorResponseSchema,
  IdParamSchema,
  MeResponseSchema,
  MessageResponseSchema,
  ModifyRoleRequestSchema,
  UserAvailabilityResponseSchema,
  UserParamSchema,
  UserResponseSchema,
  VerifyUserAvailabilityQuerySchema,
} from '@gymnotebook/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { isUniqueConstraintError } from '../../shared/persistence-errors.js';
import { assignRole } from '../application/assign-role.js';
import { deleteUser } from '../application/delete-user.js';
import { getCurrentUser } from '../application/get-current-user.js';
import { listUsers } from '../application/list-users.js';
import { removeRole } from '../application/remove-role.js';
import { verifyUserAvailability } from '../application/verify-user-availability.js';
import { EmailAlreadyExistsError, UsernameAlreadyExistsError } from '../domain/user.errors.js';
import { DrizzleUserRepository } from '../infrastructure/drizzle-user.repository.js';
import { DrizzleUserUnitOfWork } from '../infrastructure/drizzle-user-unit-of-work.js';
import { toMeResponse, toUserResponse } from './user.mapper.js';

export async function userRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const userRepository = new DrizzleUserRepository(fastify.db);
  const userUnitOfWork = new DrizzleUserUnitOfWork(fastify.db);

  app.get(
    '/',
    {
      preHandler: [fastify.authenticate, fastify.requireRole(['ROLE_ADMIN', 'ROLE_MODERATOR'])],
      schema: {
        tags: ['users'],
        summary: 'List users',
        description: 'Lists public user profiles. Password hashes are never returned.',
        security: [{ bearerAuth: [] }],
        response: {
          200: z.array(UserResponseSchema),
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const users = await listUsers(userRepository);
      return reply.send(users.map(toUserResponse));
    },
  );

  app.get(
    '/verifyuser/:username/:email',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['users'],
        summary: 'Verify username and email availability',
        description:
          'Legacy path-parameter compatibility endpoint. Prefer GET /api/user/verifyuser?username=&email=.',
        security: [{ bearerAuth: [] }],
        params: UserParamSchema,
        response: {
          200: MessageResponseSchema,
          400: ErrorResponseSchema,
          409: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const availability = await verifyUserAvailability(request.params, userRepository);
      if (!availability.usernameAvailable) {
        throw new UsernameAlreadyExistsError();
      }
      if (!availability.emailAvailable) {
        throw new EmailAlreadyExistsError();
      }
      return reply.send({ message: '¡Usuario y email disponibles!' });
    },
  );

  app.get(
    '/verifyuser',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['users'],
        summary: 'Verify username and email availability',
        description: 'Future-facing query-parameter availability endpoint.',
        security: [{ bearerAuth: [] }],
        querystring: VerifyUserAvailabilityQuerySchema,
        response: {
          200: UserAvailabilityResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      return reply.send(await verifyUserAvailability(request.query, userRepository));
    },
  );

  app.get(
    '/me',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole(['ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ADMIN']),
      ],
      schema: {
        tags: ['users'],
        summary: 'Get current user',
        description: 'Returns the current user using the immutable userId from the JWT payload.',
        security: [{ bearerAuth: [] }],
        response: {
          200: MeResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = await getCurrentUser(request.user.userId, userRepository);
      return reply.send(toMeResponse(user));
    },
  );

  app.put(
    '/setpermissions',
    {
      preHandler: [fastify.authenticate, fastify.requireRole(['ROLE_ADMIN'])],
      schema: {
        tags: ['users'],
        summary: 'Assign elevated role',
        description:
          'Assigns ROLE_ADMIN or ROLE_MODERATOR to a user while preserving existing roles.',
        security: [{ bearerAuth: [] }],
        body: ModifyRoleRequestSchema,
        response: {
          200: MessageResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await assignRole(
        { userId: request.body.userId, role: request.body.newRole },
        {
          transaction: (work) => userUnitOfWork.withUsersAndRoles(work),
          isDuplicateUserRoleError: (error) =>
            isUniqueConstraintError(error, ['user_roles_user_id_role_id_pk', 'PRIMARY']),
        },
      );

      return reply.send({ message: 'Permisos actualizados correctamente.' });
    },
  );

  app.put(
    '/removepermissions',
    {
      preHandler: [fastify.authenticate, fastify.requireRole(['ROLE_ADMIN'])],
      schema: {
        tags: ['users'],
        summary: 'Remove elevated role',
        description:
          'Removes ROLE_ADMIN or ROLE_MODERATOR from a user. ROLE_USER cannot be removed here.',
        security: [{ bearerAuth: [] }],
        body: ModifyRoleRequestSchema,
        response: {
          200: MessageResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await removeRole(
        { userId: request.body.userId, role: request.body.newRole },
        {
          transaction: (work) => userUnitOfWork.withUsersAndRoles(work),
        },
      );

      return reply.send({ message: 'Permisos eliminados correctamente.' });
    },
  );

  app.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate, fastify.requireRole(['ROLE_ADMIN'])],
      schema: {
        tags: ['users'],
        summary: 'Delete user',
        description:
          'Deletes a user. Administrators cannot delete themselves or the final administrator.',
        security: [{ bearerAuth: [] }],
        params: IdParamSchema,
        response: {
          204: z.null(),
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await deleteUser(
        { actorUserId: request.user.userId, targetUserId: request.params.id },
        {
          transaction: (work) => userUnitOfWork.withUsers(work),
        },
      );

      return reply.status(204).send(null);
    },
  );
}
