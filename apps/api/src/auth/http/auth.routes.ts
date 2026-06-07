import {
  ErrorResponseSchema,
  JwtResponseSchema,
  LoginRequestSchema,
  MessageResponseSchema,
  SignupRequestSchema,
} from '@gymnotebook/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { isUniqueConstraintError } from '../../shared/persistence-errors.js';
import { inTransaction } from '../../shared/transaction.js';
import { DrizzleRoleRepository } from '../../users/infrastructure/drizzle-role.repository.js';
import { DrizzleUserRepository } from '../../users/infrastructure/drizzle-user.repository.js';
import { signIn } from '../application/sign-in.js';
import { signUp } from '../application/sign-up.js';
import { Argon2PasswordHasher } from '../infrastructure/argon2-password-hasher.js';
import { BcryptPasswordHasher } from '../infrastructure/bcrypt-password-hasher.js';

export async function authRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const passwordHasher = new Argon2PasswordHasher();
  const legacyPasswordHasher = new BcryptPasswordHasher();
  const userRepository = new DrizzleUserRepository(fastify.db);

  app.post(
    '/signin',
    {
      schema: {
        tags: ['auth'],
        summary: 'Sign in',
        description: 'Authenticates a user with username and password and returns a Bearer JWT.',
        body: LoginRequestSchema,
        response: {
          200: JwtResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
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
      const result = await signIn(request.body, {
        userRepository,
        passwordHasher,
        legacyPasswordHasher,
        tokenIssuer: {
          issue: (payload) => fastify.jwt.sign(payload),
        },
      });
      return reply.send(result);
    },
  );

  app.post(
    '/signup',
    {
      schema: {
        tags: ['auth'],
        summary: 'Sign up',
        description: 'Creates a user account with the default user role.',
        body: SignupRequestSchema,
        response: {
          201: MessageResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
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
      await signUp(request.body, {
        passwordHasher,
        transaction: (work) =>
          inTransaction(fastify.db, (tx) =>
            work({
              users: new DrizzleUserRepository(tx),
              roles: new DrizzleRoleRepository(tx),
            }),
          ),
        isDuplicateUsernameError: (error) =>
          isUniqueConstraintError(error, ['users_username_unique', 'username']),
        isDuplicateEmailError: (error) =>
          isUniqueConstraintError(error, ['users_email_unique', 'email']),
      });

      return reply.code(201).send({ message: '¡Usuario registrado correctamente!' });
    },
  );

  app.get(
    '/logout',
    {
      schema: {
        tags: ['auth'],
        summary: 'Stateless logout compatibility endpoint',
        description: 'Clears no server-side state. Clients should discard their Bearer token.',
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
