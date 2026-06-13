import { MobileAuthApiError } from '@/features/auth/api/mobile-auth-api'
import type { ApiFailure } from '@/shared/api/errors'
import type { RefreshTokenStorageResult } from '@/shared/auth/refresh-token-storage'

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

  return new AuthServiceError('unknown', 'Algo salió mal. Por favor, inténtalo de nuevo.', error)
}

export function secureStorageError(
  operation: 'read' | 'write' | 'delete',
  result: RefreshTokenStorageResult<unknown>,
): AuthServiceError {
  const message =
    operation === 'read'
      ? 'El almacenamiento seguro no está disponible. Por favor, inicia sesión de nuevo.'
      : 'No se pudo guardar tu sesión de forma segura. Por favor, inténtalo de nuevo.'

  return new AuthServiceError('secure_storage_unavailable', message, result)
}

export function userFacingAuthError(error: unknown): string {
  return toAuthServiceError(error).message
}

function mapApiFailureToAuthError(failure: ApiFailure, cause: unknown): AuthServiceError {
  if (failure.kind === 'network_unavailable') {
    return new AuthServiceError(
      'network_unavailable',
      'Comprueba tu conexión e inténtalo de nuevo.',
      cause,
    )
  }

  if (failure.kind === 'timeout') {
    return new AuthServiceError(
      'timeout',
      'La solicitud ha expirado. Por favor, inténtalo de nuevo.',
      cause,
    )
  }

  if (failure.kind === 'validation') {
    return new AuthServiceError(
      'validation',
      'No se pudo verificar la respuesta del servidor. Por favor, inténtalo de nuevo.',
      cause,
    )
  }

  if (failure.kind !== 'backend') {
    return new AuthServiceError('unknown', 'Algo salió mal. Por favor, inténtalo de nuevo.', cause)
  }

  switch (failure.code) {
    case 'invalid_credentials':
      return new AuthServiceError(
        'invalid_credentials',
        'El usuario o la contraseña son incorrectos.',
        cause,
      )
    case 'username_already_exists':
      return new AuthServiceError(
        'username_conflict',
        'Ese nombre de usuario ya está en uso.',
        cause,
      )
    case 'email_already_exists':
      return new AuthServiceError('email_conflict', 'Ese correo electrónico ya está en uso.', cause)
    case 'invalid_mobile_session':
    case 'mobile_session_required':
      return new AuthServiceError(
        'invalid_mobile_session',
        'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
        cause,
      )
    default:
      return new AuthServiceError(
        'unknown',
        'Algo salió mal. Por favor, inténtalo de nuevo.',
        cause,
      )
  }
}
