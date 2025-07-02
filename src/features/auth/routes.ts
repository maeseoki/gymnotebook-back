import { type JwtPayload, authenticate } from '@/shared/middleware';
import { createSuccessResponse } from '@/shared/utils';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { type LoginRequest, type RegisterRequest, loginSchema, registerSchema } from './schemas';
import { AuthService } from './service';

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService();

  // Login endpoint
  fastify.post<{ Body: LoginRequest }>(
    '/signin',
    {
      schema: {
        body: loginSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      username: { type: 'string' },
                      email: { type: 'string' },
                      roles: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const user = await authService.login(request.body);

      // Generate JWT token
      const token = fastify.jwt.sign({
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
      } as JwtPayload);

      return reply.send(createSuccessResponse({ token, user }));
    }
  );

  // Register endpoint
  fastify.post<{ Body: RegisterRequest }>(
    '/signup',
    {
      schema: {
        body: registerSchema,
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  username: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const user = await authService.register(request.body);
      return reply.status(201).send(createSuccessResponse(user, 'User registered successfully'));
    }
  );

  // Logout endpoint (stateless, just returns success)
  fastify.get(
    '/logout',
    {
      preHandler: authenticate,
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      return reply.send(createSuccessResponse(null, 'Logged out successfully'));
    }
  );
}
