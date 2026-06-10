import {
  ErrorResponseSchema,
  MobileLogoutRequestSchema,
  MobileRefreshRequestSchema,
  MobileRevokeAllSessionsQuerySchema,
  MobileRevokeAllSessionsResponseSchema,
  MobileSessionIdParamSchema,
  MobileSessionsResponseSchema,
  MobileSignInRequestSchema,
  MobileSignUpRequestSchema,
  MobileTokenPairResponseSchema,
} from '@gymnotebook/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { JwtPayload } from '../../shared/jwt.js';
import { createMobileAuthDependencies } from './mobile-auth.dependencies.js';
import {
  MobileSessionRequiredHttpError,
  mapRefreshError,
  mapRevokeOneError,
} from './mobile-auth.mapper.js';

export async function mobileAuthRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const deps = createMobileAuthDependencies(fastify);

  const requireActiveMobileSession = async (request: FastifyRequest, reply: FastifyReply) => {
    await fastify.authenticate(request, reply);
    const sessionId = request.user.sessionId;
    if (!sessionId) {
      throw new MobileSessionRequiredHttpError();
    }

    try {
      await deps.validateActiveMobileSessionForUser({
        userId: request.user.userId,
        sessionId,
      });
    } catch (error) {
      mapRefreshError(error);
    }
  };

  app.post(
    '/signin',
    {
      schema: {
        tags: ['mobile-auth'],
        summary: 'Mobile sign in',
        description:
          'Authenticates username/password credentials and creates a revocable mobile session with a rotating refresh token.',
        body: MobileSignInRequestSchema,
        response: {
          200: MobileTokenPairResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          429: ErrorResponseSchema,
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
      const user = await deps.validateCredentials(request.body);
      const result = await deps.createMobileSession({
        user,
        device: request.body.device,
      });
      return reply.send(result);
    },
  );

  app.post(
    '/signup',
    {
      schema: {
        tags: ['mobile-auth'],
        summary: 'Mobile sign up',
        description:
          'Creates a username/password account with ROLE_USER and returns the initial mobile token pair.',
        body: MobileSignUpRequestSchema,
        response: {
          201: MobileTokenPairResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
          429: ErrorResponseSchema,
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
      const result = await deps.signUpMobile(request.body);
      return reply.code(201).send(result);
    },
  );

  app.post(
    '/refresh',
    {
      schema: {
        tags: ['mobile-auth'],
        summary: 'Rotate mobile refresh token',
        description:
          'Rotates a valid opaque refresh token and returns a new access/refresh token pair. Sensitive failures all return invalid_mobile_session.',
        body: MobileRefreshRequestSchema,
        response: {
          200: MobileTokenPairResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          429: ErrorResponseSchema,
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
      try {
        const result = await deps.rotateMobileSession(request.body);
        return reply.send(result);
      } catch (error) {
        mapRefreshError(error);
      }
    },
  );

  app.post(
    '/logout',
    {
      schema: {
        tags: ['mobile-auth'],
        summary: 'Mobile current-device logout',
        description:
          'Idempotently revokes the mobile session family matching the supplied refresh token. A valid access token is not required.',
        body: MobileLogoutRequestSchema,
        response: {
          204: z.null(),
          400: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await deps.revokeMobileSessionByRefreshToken(request.body);
      return reply.code(204).send(null);
    },
  );

  app.get(
    '/sessions',
    {
      preHandler: requireActiveMobileSession,
      schema: {
        tags: ['mobile-auth'],
        summary: 'List mobile sessions',
        description:
          'Lists active mobile sessions for the authenticated user. Requires a mobile access token containing a sessionId claim.',
        security: [{ bearerAuth: [] }],
        response: {
          200: MobileSessionsResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await deps.listMobileSessionsForUser({
        userId: request.user.userId,
        currentSessionId: requireSessionId(request.user),
      });
      return reply.send({ sessions: result });
    },
  );

  app.delete(
    '/sessions/:sessionId',
    {
      preHandler: requireActiveMobileSession,
      schema: {
        tags: ['mobile-auth'],
        summary: 'Revoke one mobile session',
        description:
          'Revokes one owned mobile session by stable session ID. Foreign and missing sessions are indistinguishable.',
        security: [{ bearerAuth: [] }],
        params: MobileSessionIdParamSchema,
        response: {
          204: z.null(),
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        await deps.revokeMobileSessionByIdForUser({
          userId: request.user.userId,
          sessionId: request.params.sessionId,
        });
        return reply.code(204).send(null);
      } catch (error) {
        mapRevokeOneError(error);
      }
    },
  );

  app.delete(
    '/sessions',
    {
      preHandler: requireActiveMobileSession,
      schema: {
        tags: ['mobile-auth'],
        summary: 'Revoke all mobile sessions',
        description:
          'Revokes all mobile sessions for the authenticated user. keepCurrent defaults to false for log out all devices.',
        security: [{ bearerAuth: [] }],
        querystring: MobileRevokeAllSessionsQuerySchema,
        response: {
          200: MobileRevokeAllSessionsResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const currentSessionId = requireSessionId(request.user);
      const revoked = await deps.revokeAllMobileSessionsForUser({
        userId: request.user.userId,
        exceptSessionId: request.query.keepCurrent ? currentSessionId : undefined,
      });
      return reply.send({ revoked });
    },
  );
}

function requireSessionId(user: JwtPayload): string {
  if (!user.sessionId) {
    throw new MobileSessionRequiredHttpError();
  }
  return user.sessionId;
}
