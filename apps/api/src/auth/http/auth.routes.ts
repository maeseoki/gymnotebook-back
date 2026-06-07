import {
  JwtResponseSchema,
  type LoginRequest,
  LoginRequestSchema,
  MessageResponseSchema,
  type SignupRequest,
  SignupRequestSchema,
} from '@gymnotebook/contracts';
import type { FastifyInstance } from 'fastify';
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
    },
    async (request, reply) => {
      const userRepository = new DrizzleUserRepository(fastify.db);
      const generateToken = (payload: { sub: string; roles: string[] }) =>
        // Put sub in options, claims in payload body
        fastify.jwt.sign({ sub: payload.sub, roles: payload.roles });

      try {
        const result = await signIn(request.body as LoginRequest, {
          userRepository,
          generateToken,
        });
        return reply.send(result);
      } catch (err) {
        if (err instanceof InvalidCredentialsError) {
          return (reply as any).code(401).send({ message: err.message });
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
          return (reply as any).code(400).send({ message: (err as Error).message });
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
