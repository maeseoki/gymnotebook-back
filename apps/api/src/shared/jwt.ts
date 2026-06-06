import jwtPlugin from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; roles: string[] };
    user: { sub: string; roles: string[] };
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

    fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({
          status: 401,
          error: 'Unauthorized',
          message: 'Invalid or missing token',
          path: request.url,
        });
      }
    });

    fastify.decorate('requireRole', function (roles: string[]) {
      return async function (request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as { sub: string; roles: string[] };
        const hasRole = roles.some((role) => user.roles?.includes(role));
        if (!hasRole) {
          return reply.status(403).send({
            status: 403,
            error: 'Forbidden',
            message: 'Insufficient permissions',
            path: request.url,
          });
        }
      };
    });
  },
  { name: 'jwt-auth', dependencies: ['config'] },
);
