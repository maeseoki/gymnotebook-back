import {
  type ERole,
  MeResponseSchema,
  MessageResponseSchema,
  ModifyRoleRequestSchema,
  UserResponseSchema,
} from '@gymnotebook/contracts';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ResourceNotFoundError } from '../../shared/errors.js';
import { DrizzleRoleRepository } from '../infrastructure/drizzle-role.repository.js';
import { DrizzleUserRepository } from '../infrastructure/drizzle-user.repository.js';

export async function userRoutes(fastify: FastifyInstance) {
  // GET /api/user - admin or moderator
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate, fastify.requireRole(['ROLE_ADMIN', 'ROLE_MODERATOR'])],
      schema: {
        response: {
          200: z.array(UserResponseSchema),
        },
      },
    },
    async (_request, reply) => {
      const userRepository = new DrizzleUserRepository(fastify.db);
      const users = await userRepository.findAll();
      return reply.send(
        users.map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          roles: u.roles.map((r) => r.name),
        })),
      );
    },
  );

  // GET /api/user/verifyuser/:username/:email - any authenticated user
  fastify.get(
    '/verifyuser/:username/:email',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: z.object({ username: z.string(), email: z.string() }),
        response: {
          200: MessageResponseSchema,
          400: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userRepository = new DrizzleUserRepository(fastify.db);
      const { username, email } = request.params as { username: string; email: string };

      if (await userRepository.existsByUsername(username)) {
        return reply.status(400).send({ message: 'Error: El nombre de usuario ya está en uso!' });
      }
      if (await userRepository.existsByEmail(email)) {
        return reply.status(400).send({ message: 'Error: El email ya está en uso!' });
      }
      return reply.send({ message: '¡Usuario y email disponibles!' });
    },
  );

  // GET /api/user/me
  fastify.get(
    '/me',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireRole(['ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ADMIN']),
      ],
      schema: {
        response: {
          200: MeResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userRepository = new DrizzleUserRepository(fastify.db);
      const jwtUser = request.user;
      const user = await userRepository.findByUsername(jwtUser.sub);
      if (!user) {
        throw new ResourceNotFoundError('User not found');
      }
      return reply.send({
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles.map((r) => r.name),
      });
    },
  );

  // PUT /api/user/setpermissions - admin only
  fastify.put(
    '/setpermissions',
    {
      preHandler: [fastify.authenticate, fastify.requireRole(['ROLE_ADMIN'])],
      schema: {
        body: ModifyRoleRequestSchema,
        response: {
          200: MessageResponseSchema,
          400: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userRepository = new DrizzleUserRepository(fastify.db);
      const roleRepository = new DrizzleRoleRepository(fastify.db);
      const { userId, newRole } = request.body as { userId: number; newRole: ERole };

      const user = await userRepository.findById(userId);
      if (!user) {
        return reply.status(400).send({ message: 'Error: El usuario no existe.' });
      }

      if (!['ROLE_ADMIN', 'ROLE_MODERATOR'].includes(newRole)) {
        return reply.status(400).send({ message: 'Error: El rol no existe.' });
      }

      if (user.roles.some((r) => r.name === newRole)) {
        const roleLabel = newRole === 'ROLE_ADMIN' ? 'administrador' : 'moderador';
        return reply.status(400).send({ message: `Error: El usuario ya es ${roleLabel}.` });
      }

      const role = await roleRepository.findByName(newRole);
      if (!role) {
        return reply.status(400).send({ message: 'Error: El rol no existe.' });
      }

      const newRoleIds = [...user.roles.map((r) => r.id), role.id];
      await userRepository.updateRoles(userId, newRoleIds);

      return reply.send({ message: 'Permisos actualizados correctamente.' });
    },
  );

  // PUT /api/user/removepermissions - admin only
  fastify.put(
    '/removepermissions',
    {
      preHandler: [fastify.authenticate, fastify.requireRole(['ROLE_ADMIN'])],
      schema: {
        body: ModifyRoleRequestSchema,
        response: {
          200: MessageResponseSchema,
          400: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userRepository = new DrizzleUserRepository(fastify.db);
      const { userId, newRole } = request.body as { userId: number; newRole: ERole };

      const user = await userRepository.findById(userId);
      if (!user) {
        return reply.status(400).send({ message: 'Error: El usuario no existe.' });
      }

      if (!['ROLE_ADMIN', 'ROLE_MODERATOR'].includes(newRole)) {
        return reply.status(400).send({ message: 'Error: El rol no existe.' });
      }

      if (!user.roles.some((r) => r.name === newRole)) {
        const roleLabel = newRole === 'ROLE_ADMIN' ? 'administrador' : 'moderador';
        return reply.status(400).send({ message: `Error: El usuario no es ${roleLabel}.` });
      }

      const newRoleIds = user.roles.filter((r) => r.name !== newRole).map((r) => r.id);
      await userRepository.updateRoles(userId, newRoleIds);

      return reply.send({ message: 'Permisos eliminados correctamente.' });
    },
  );

  // DELETE /api/user/:id - admin only
  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate, fastify.requireRole(['ROLE_ADMIN'])],
      schema: {
        params: z.object({ id: z.coerce.number().int().positive() }),
        response: {
          200: MessageResponseSchema,
          400: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userRepository = new DrizzleUserRepository(fastify.db);
      const { id } = request.params as { id: number };

      if (!(await userRepository.existsById(id))) {
        return reply.status(400).send({ message: 'Error: El usuario no existe.' });
      }

      await userRepository.deleteById(id);
      return reply.send({ message: 'Usuario eliminado correctamente.' });
    },
  );
}
