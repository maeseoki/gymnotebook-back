import jwtPlugin from '@fastify/jwt';
import type { ERole } from '@gymnotebook/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { ForbiddenError, UnauthorizedError } from './errors.js';

export interface JwtPayload {
  sub: string;
  userId: number;
  roles: ERole[];
  sessionId?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (
      roles: ERole[],
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

export const jwtAuthPlugin = fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(jwtPlugin, {
      secret: fastify.config.JWT_SECRET,
      sign: {
        expiresIn: Math.floor(fastify.config.JWT_EXPIRATION_MS / 1000),
      },
    });

    fastify.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        throw new UnauthorizedError('Invalid or missing token');
      }
    });

    fastify.decorate(
      'requireRole',
      (roles: ERole[]) => async (request: FastifyRequest, _reply: FastifyReply) => {
        const user = request.user;
        const hasRole = roles.some((role) => user.roles?.includes(role));
        if (!hasRole) {
          throw new ForbiddenError('Insufficient permissions');
        }
      },
    );
  },
  { name: 'jwt-auth', dependencies: ['config'] },
);
