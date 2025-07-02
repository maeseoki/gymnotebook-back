import { authenticate, requireAdmin, requireModerator } from '@/shared/middleware';
import { createPaginatedResponse, createSuccessResponse } from '@/shared/utils';
import type { FastifyInstance } from 'fastify';
import {
  type DeleteUserParams,
  type GetUsersQuery,
  type ModifyRoleRequest,
  type VerifyUserParams,
  deleteUserParamsSchema,
  getUsersQuerySchema,
  modifyRoleSchema,
  verifyUserParamsSchema,
} from './schemas';
import { UserService } from './service';

export async function userRoutes(fastify: FastifyInstance) {
  const userService = new UserService();

  // Get all users (admin/moderator only)
  fastify.get<{ Querystring: GetUsersQuery }>(
    '/',
    { preHandler: [authenticate, requireModerator()] },
    async (request, reply) => {
      const validation = getUsersQuerySchema.safeParse(request.query);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
        });
      }

      const result = await userService.getAllUsers(validation.data);
      return reply.send(createPaginatedResponse(result.users, result.pagination));
    }
  );

  // Verify username and email availability
  fastify.get<{ Params: VerifyUserParams }>(
    '/verifyuser/:username/:email',
    async (request, reply) => {
      const validation = verifyUserParamsSchema.safeParse(request.params);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
        });
      }

      const result = await userService.verifyUsernameAndEmail(validation.data);
      return reply.send(createSuccessResponse(result));
    }
  );

  // Get current user info
  fastify.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.id;
    const user = await userService.getCurrentUser(userId);
    return reply.send(createSuccessResponse(user));
  });

  // Set user permissions (admin only)
  fastify.put<{ Body: ModifyRoleRequest }>(
    '/setpermissions',
    { preHandler: [authenticate, requireAdmin()] },
    async (request, reply) => {
      const validation = modifyRoleSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
        });
      }

      const result = await userService.setPermissions(validation.data);
      return reply.send(createSuccessResponse(result));
    }
  );

  // Remove user permissions (admin only)
  fastify.put<{ Body: ModifyRoleRequest }>(
    '/removepermissions',
    { preHandler: [authenticate, requireAdmin()] },
    async (request, reply) => {
      const validation = modifyRoleSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
        });
      }

      const result = await userService.removePermissions(validation.data);
      return reply.send(createSuccessResponse(result));
    }
  );

  // Delete user (admin only)
  fastify.delete<{ Params: DeleteUserParams }>(
    '/:id',
    { preHandler: [authenticate, requireAdmin()] },
    async (request, reply) => {
      const validation = deleteUserParamsSchema.safeParse(request.params);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
        });
      }

      const result = await userService.deleteUser(validation.data);
      return reply.send(createSuccessResponse(result));
    }
  );
}
