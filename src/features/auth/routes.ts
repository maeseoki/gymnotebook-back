import { type JwtPayload, authenticate } from '@/shared/middleware';
import { createSuccessResponse } from '@/shared/utils';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { type LoginRequest, type RegisterRequest, loginSchema, registerSchema } from './schemas';
import { AuthService } from './service';

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService();

  // Login endpoint
  fastify.post<{ Body: LoginRequest }>('/signin', async (request, reply) => {
    const validation = loginSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        message: 'Validation failed',
        errors: validation.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
      });
    }

    const user = await authService.login(validation.data);

    // Generate JWT token
    const token = fastify.jwt.sign({
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
    } as JwtPayload);

    return reply.send(createSuccessResponse({ token, user }));
  });

  // Register endpoint
  fastify.post<{ Body: RegisterRequest }>('/signup', async (request, reply) => {
    const validation = registerSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        message: 'Validation failed',
        errors: validation.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
      });
    }

    const user = await authService.register(validation.data);
    return reply.status(201).send(createSuccessResponse(user, 'User registered successfully'));
  });

  // Logout endpoint (stateless, just returns success)
  fastify.get('/logout', { preHandler: authenticate }, async (request, reply) => {
    return reply.send(createSuccessResponse(null, 'Logged out successfully'));
  });
}
