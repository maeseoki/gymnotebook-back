import type { ErrorResponse } from '@gymnotebook/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from 'fastify-type-provider-zod';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ResourceNotFoundError extends AppError {
  constructor(message: string) {
    super(404, 'resource_not_found', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'resource_conflict', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(403, 'forbidden', message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(401, 'unauthorized', message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, 'validation_failed', message, details);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Payload too large') {
    super(413, 'payload_too_large', message);
  }
}

export function registerErrorHandlers(fastify: FastifyInstance) {
  fastify.setNotFoundHandler((request, reply) => {
    sendError(reply, request, {
      statusCode: 404,
      code: 'route_not_found',
      message: 'Route not found',
    });
  });

  fastify.setErrorHandler((error, request, reply) => {
    const mapped = mapError(error);

    if (mapped.statusCode >= 500) {
      request.log.error({ err: error }, mapped.message);
    } else {
      request.log.info({ err: error, code: mapped.code }, mapped.message);
    }

    sendError(reply, request, mapped);
  });
}

function mapError(error: unknown): Omit<ErrorResponse, 'requestId'> {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    };
  }

  const applicationError = getApplicationError(error);
  if (applicationError) {
    return applicationError;
  }

  if (hasZodFastifySchemaValidationErrors(error)) {
    return {
      statusCode: 400,
      code: 'validation_failed',
      message: 'Request validation failed',
      details: error.validation,
    };
  }

  if (isResponseSerializationError(error)) {
    return {
      statusCode: 500,
      code: 'response_serialization_failed',
      message: 'Internal server error',
    };
  }

  const code = getErrorCode(error);
  const statusCode = getStatusCode(error);

  if (statusCode === 413 || code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
    return {
      statusCode: 413,
      code: 'payload_too_large',
      message: 'Payload too large',
    };
  }

  if (statusCode === 429) {
    return {
      statusCode: 429,
      code: 'rate_limit_exceeded',
      message: 'Rate limit exceeded',
    };
  }

  if (code?.startsWith('FST_JWT')) {
    return {
      statusCode: 401,
      code: 'unauthorized',
      message: 'Invalid or missing token',
    };
  }

  if (code?.startsWith('FST_ERR_MULTIPART')) {
    return {
      statusCode: statusCode === 413 ? 413 : 400,
      code: statusCode === 413 ? 'payload_too_large' : 'multipart_invalid',
      message: statusCode === 413 ? 'Payload too large' : 'Invalid multipart request',
    };
  }

  if (statusCode === 400) {
    return {
      statusCode: 400,
      code: 'bad_request',
      message: error instanceof Error && error.message ? error.message : 'Bad request',
    };
  }

  return {
    statusCode: 500,
    code: 'internal_server_error',
    message: 'Internal server error',
  };
}

function sendError(
  reply: FastifyReply,
  request: FastifyRequest,
  error: Omit<ErrorResponse, 'requestId'>,
) {
  const response: ErrorResponse = {
    ...error,
    requestId: request.id,
  };

  return reply.code(error.statusCode).send(response);
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const maybeError = error as { code?: unknown };
  return typeof maybeError.code === 'string' ? maybeError.code : undefined;
}

function getApplicationError(error: unknown): Omit<ErrorResponse, 'requestId'> | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const maybeError = error as {
    statusCode?: unknown;
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
  if (
    typeof maybeError.statusCode === 'number' &&
    typeof maybeError.code === 'string' &&
    typeof maybeError.message === 'string'
  ) {
    if (maybeError.code.startsWith('FST_')) {
      return undefined;
    }
    return {
      statusCode: maybeError.statusCode,
      code: maybeError.code,
      message: maybeError.message,
      ...(maybeError.details === undefined ? {} : { details: maybeError.details }),
    };
  }
  return undefined;
}

function getStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const maybeError = error as { statusCode?: unknown; status?: unknown };
  if (typeof maybeError.statusCode === 'number') {
    return maybeError.statusCode;
  }
  if (typeof maybeError.status === 'number') {
    return maybeError.status;
  }
  return undefined;
}
