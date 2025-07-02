import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '@/shared/types';
import { createErrorResponse } from '@/shared/utils';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export async function errorHandler(error: Error, request: FastifyRequest, reply: FastifyReply) {
  request.log.error(error);

  if (error instanceof ValidationError) {
    return reply.status(400).send(createErrorResponse(error.message, error.errors));
  }

  if (error instanceof AuthenticationError) {
    return reply.status(401).send(createErrorResponse(error.message));
  }

  if (error instanceof AuthorizationError) {
    return reply.status(403).send(createErrorResponse(error.message));
  }

  if (error instanceof NotFoundError) {
    return reply.status(404).send(createErrorResponse(error.message));
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send(createErrorResponse(error.message));
  }

  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    const zodError = error as { errors: Array<{ path: (string | number)[]; message: string }> };
    const errors = zodError.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    return reply.status(400).send(createErrorResponse('Validation failed', errors));
  }

  // Handle JWT errors
  if (error.message.includes('jwt')) {
    return reply.status(401).send(createErrorResponse('Invalid or expired token'));
  }

  // Generic server error
  return reply.status(500).send(createErrorResponse('Internal server error'));
}

export function registerErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler(errorHandler);
}
