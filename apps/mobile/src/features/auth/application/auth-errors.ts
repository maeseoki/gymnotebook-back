import { MobileAuthApiError } from '@/features/auth/api/mobile-auth-api';
import type { ApiFailure } from '@/shared/api/errors';
import type { RefreshTokenStorageResult } from '@/shared/auth/refresh-token-storage';

export type AuthErrorReason =
  | 'invalid_credentials'
  | 'username_conflict'
  | 'email_conflict'
  | 'invalid_mobile_session'
  | 'network_unavailable'
  | 'timeout'
  | 'secure_storage_unavailable'
  | 'validation'
  | 'unknown';

export class AuthServiceError extends Error {
  constructor(
    readonly reason: AuthErrorReason,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

export function toAuthServiceError(error: unknown): AuthServiceError {
  if (error instanceof AuthServiceError) {
    return error;
  }

  if (error instanceof MobileAuthApiError) {
    return mapApiFailureToAuthError(error.failure, error);
  }

  return new AuthServiceError('unknown', 'Something went wrong. Please try again.', error);
}

export function secureStorageError(
  operation: 'read' | 'write' | 'delete',
  result: RefreshTokenStorageResult<unknown>,
): AuthServiceError {
  const message =
    operation === 'read'
      ? 'Secure storage is unavailable. Please sign in again.'
      : 'Your session could not be saved securely. Please try again.';

  return new AuthServiceError('secure_storage_unavailable', message, result);
}

export function userFacingAuthError(error: unknown): string {
  return toAuthServiceError(error).message;
}

function mapApiFailureToAuthError(failure: ApiFailure, cause: unknown): AuthServiceError {
  if (failure.kind === 'network_unavailable') {
    return new AuthServiceError(
      'network_unavailable',
      'Check your connection and try again.',
      cause,
    );
  }

  if (failure.kind === 'timeout') {
    return new AuthServiceError('timeout', 'The request timed out. Please try again.', cause);
  }

  if (failure.kind === 'validation') {
    return new AuthServiceError(
      'validation',
      'The server response could not be verified. Please try again.',
      cause,
    );
  }

  if (failure.kind !== 'backend') {
    return new AuthServiceError('unknown', 'Something went wrong. Please try again.', cause);
  }

  switch (failure.code) {
    case 'invalid_credentials':
      return new AuthServiceError(
        'invalid_credentials',
        'The username or password is incorrect.',
        cause,
      );
    case 'username_already_exists':
      return new AuthServiceError('username_conflict', 'That username is already in use.', cause);
    case 'email_already_exists':
      return new AuthServiceError('email_conflict', 'That email is already in use.', cause);
    case 'invalid_mobile_session':
    case 'mobile_session_required':
      return new AuthServiceError(
        'invalid_mobile_session',
        'Your session has expired. Please sign in again.',
        cause,
      );
    default:
      return new AuthServiceError('unknown', 'Something went wrong. Please try again.', cause);
  }
}
