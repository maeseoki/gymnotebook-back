import { MobileAuthApiError } from '@/features/auth/api/mobile-auth-api'
import type { ApiFailure } from '@/shared/api/errors'
import type { RefreshTokenStorageResult } from '@/shared/auth/refresh-token-storage'
import i18n from '@/shared/i18n'

export type AuthErrorReason =
  | 'invalid_credentials'
  | 'username_conflict'
  | 'email_conflict'
  | 'invalid_mobile_session'
  | 'network_unavailable'
  | 'timeout'
  | 'secure_storage_unavailable'
  | 'validation'
  | 'unknown'

export class AuthServiceError extends Error {
  constructor(
    readonly reason: AuthErrorReason,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'AuthServiceError'
  }
}

export function toAuthServiceError(error: unknown): AuthServiceError {
  if (error instanceof AuthServiceError) {
    return error
  }

  if (error instanceof MobileAuthApiError) {
    return mapApiFailureToAuthError(error.failure, error)
  }

  return new AuthServiceError('unknown', i18n.t('auth.errors.unknown'), error)
}

export function secureStorageError(
  operation: 'read' | 'write' | 'delete',
  result: RefreshTokenStorageResult<unknown>,
): AuthServiceError {
  const message =
    operation === 'read'
      ? i18n.t('auth.errors.secureStorageRead')
      : i18n.t('auth.errors.secureStorageWrite')

  return new AuthServiceError('secure_storage_unavailable', message, result)
}

export function userFacingAuthError(error: unknown): string {
  return toAuthServiceError(error).message
}

function mapApiFailureToAuthError(failure: ApiFailure, cause: unknown): AuthServiceError {
  if (failure.kind === 'network_unavailable') {
    return new AuthServiceError(
      'network_unavailable',
      i18n.t('auth.errors.networkUnavailable'),
      cause,
    )
  }

  if (failure.kind === 'timeout') {
    return new AuthServiceError('timeout', i18n.t('auth.errors.timeout'), cause)
  }

  if (failure.kind === 'validation') {
    return new AuthServiceError('validation', i18n.t('auth.errors.validation'), cause)
  }

  if (failure.kind !== 'backend') {
    return new AuthServiceError('unknown', i18n.t('auth.errors.unknown'), cause)
  }

  switch (failure.code) {
    case 'invalid_credentials':
      return new AuthServiceError(
        'invalid_credentials',
        i18n.t('auth.errors.invalidCredentials'),
        cause,
      )
    case 'username_already_exists':
      return new AuthServiceError(
        'username_conflict',
        i18n.t('auth.errors.usernameConflict'),
        cause,
      )
    case 'email_already_exists':
      return new AuthServiceError('email_conflict', i18n.t('auth.errors.emailConflict'), cause)
    case 'invalid_mobile_session':
    case 'mobile_session_required':
      return new AuthServiceError(
        'invalid_mobile_session',
        i18n.t('auth.errors.invalidMobileSession'),
        cause,
      )
    default:
      return new AuthServiceError('unknown', i18n.t('auth.errors.unknown'), cause)
  }
}
