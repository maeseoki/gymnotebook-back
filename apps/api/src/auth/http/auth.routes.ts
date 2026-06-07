import {
  JwtResponseSchema,
  type LoginRequest,
  LoginRequestSchema,
  MessageResponseSchema,
  type SignupRequest,
  SignupRequestSchema,
} from '@gymnotebook/contracts';
import type { FastifyInstance } from 'fastify';
import { ConflictError, UnauthorizedError } from '../../shared/errors.js';
import type { JwtPayload } from '../../shared/jwt.js';
import { DrizzleRoleRepository } from '../../users/infrastructure/drizzle-role.repository.js';
import { DrizzleUserRepository } from '../../users/infrastructure/drizzle-user.repository.js';
import { signIn } from '../application/signin.js';
import { signUp } from '../application/signup.js';
import {
  DuplicateEmailError,
  DuplicateUsernameError,
  InvalidCredentialsError,
} from '../domain/auth.errors.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/signin',
    {
      schema: {
        body: LoginRequestSchema,
        response: {
          200: JwtResponseSchema,
        },
      },
      config: {
        rateLimit: {
          max: fastify.config.AUTH_RATE_LIMIT_MAX,
          timeWindow: fastify.config.AUTH_RATE_LIMIT_WINDOW_MS,
        },
      },
    },
    async (request, reply) => {
      const userRepository = new DrizzleUserRepository(fastify.db);
      const generateToken = (payload: JwtPayload) => fastify.jwt.sign(payload);

      try {
        const result = await signIn(request.body as LoginRequest, {
          userRepository,
          generateToken,
        });
        return reply.send(result);
      } catch (err) {
        if (err instanceof InvalidCredentialsError) {
          throw new UnauthorizedError(err.message);
        }
        throw err;
      }
    },
  );

  fastify.post(
    '/signup',
    {
      schema: {
        body: SignupRequestSchema,
        response: {
          201: MessageResponseSchema,
        },
      },
      config: {
        rateLimit: {
          max: fastify.config.AUTH_RATE_LIMIT_MAX,
          timeWindow: fastify.config.AUTH_RATE_LIMIT_WINDOW_MS,
        },
      },
    },
    async (request, reply) => {
      const userRepository = new DrizzleUserRepository(fastify.db);
      const roleRepository = new DrizzleRoleRepository(fastify.db);

      try {
        const result = await signUp(request.body as SignupRequest, {
          userRepository,
          roleRepository,
        });
        return reply
          .code(201)
          .header('Location', `/api/users/${result.username}`)
          .send({ message: '¡Usuario registrado correctamente!' });
      } catch (err) {
        if (err instanceof DuplicateUsernameError || err instanceof DuplicateEmailError) {
          throw new ConflictError(err.message);
        }
        throw err;
      }
    },
  );

  fastify.get(
    '/logout',
    {
      schema: {
        response: {
          200: MessageResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      return reply.send({ message: '¡Desconectado correctamente!' });
    },
  );
}
