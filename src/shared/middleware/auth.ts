import {
  AuthenticationError,
  AuthorizationError,
  type JwtPayload,
  type RoleType,
} from '@/shared/types';
import type { FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    throw new AuthenticationError('Invalid or missing token');
  }
}

export function authorize(roles: RoleType[] = []) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new AuthenticationError('User not authenticated');
    }

    if (roles.length === 0) {
      return; // No specific roles required, just authentication
    }

    const userRoles = request.user.roles || [];
    const hasRequiredRole = roles.some((role) => userRoles.includes(role));

    if (!hasRequiredRole) {
      throw new AuthorizationError(`Access denied. Required roles: ${roles.join(', ')}`);
    }
  };
}

// Convenience functions for common role checks
export const requireUser = () => authorize(['ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ADMIN']);
export const requireModerator = () => authorize(['ROLE_MODERATOR', 'ROLE_ADMIN']);
export const requireAdmin = () => authorize(['ROLE_ADMIN']);
