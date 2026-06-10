import {
  type ErrorResponse,
  MobileRevokeAllSessionsResponseSchema,
  MobileSessionsResponseSchema,
  MobileTokenPairResponseSchema,
} from '@gymnotebook/contracts';
import { AppError } from '../../shared/errors.js';
import { MobileSessionError, MobileSessionNotFoundError } from '../domain/mobile-session.errors.js';

export const mobileTokenPairResponseSchema = MobileTokenPairResponseSchema;
export const mobileSessionsResponseSchema = MobileSessionsResponseSchema;
export const mobileRevokeAllSessionsResponseSchema = MobileRevokeAllSessionsResponseSchema;

export class InvalidMobileSessionHttpError extends AppError {
  constructor() {
    super(401, 'invalid_mobile_session', 'Invalid mobile session');
    this.name = 'InvalidMobileSessionHttpError';
  }
}

export class MobileSessionRequiredHttpError extends AppError {
  constructor() {
    super(401, 'mobile_session_required', 'Mobile session access token required');
    this.name = 'MobileSessionRequiredHttpError';
  }
}

export class MobileSessionNotFoundHttpError extends AppError {
  constructor() {
    super(404, 'mobile_session_not_found', 'Mobile session not found');
    this.name = 'MobileSessionNotFoundHttpError';
  }
}

export function mapRefreshError(error: unknown): never {
  if (error instanceof MobileSessionError) {
    throw new InvalidMobileSessionHttpError();
  }
  throw error;
}

export function mapRevokeOneError(error: unknown): never {
  if (error instanceof MobileSessionNotFoundError) {
    throw new MobileSessionNotFoundHttpError();
  }
  throw error;
}

export const invalidMobileSessionErrorResponse = {
  statusCode: 401,
  code: 'invalid_mobile_session',
  message: 'Invalid mobile session',
} satisfies Omit<ErrorResponse, 'requestId'>;

export const mobileSessionRequiredErrorResponse = {
  statusCode: 401,
  code: 'mobile_session_required',
  message: 'Mobile session access token required',
} satisfies Omit<ErrorResponse, 'requestId'>;
