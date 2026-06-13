import type { ApiFailure } from '@/shared/api/errors'
import { ExercisesApiError } from '../api/exercises-api'

export function mapExerciseError(error: unknown): string {
  let failure: ApiFailure | null = null

  if (error instanceof ExercisesApiError) {
    failure = error.failure
  } else if (
    error &&
    typeof error === 'object' &&
    'failure' in error &&
    error.failure &&
    typeof error.failure === 'object' &&
    'kind' in error.failure
  ) {
    failure = error.failure as ApiFailure
  }

  if (failure) {
    if (failure.kind === 'backend') {
      if (failure.status === 401) {
        return 'Sesión expirada. Por favor, inicia sesión de nuevo.'
      }
      if (failure.status === 404) {
        return 'Ejercicio no encontrado.'
      }
      if (failure.status === 409) {
        return failure.message || 'Este ejercicio no se puede eliminar porque está en uso.'
      }
      return failure.message || 'Ocurrió un error en el servidor.'
    }
    if (failure.kind === 'validation') {
      return failure.message || 'Error de validación.'
    }
    if (failure.kind === 'network_unavailable') {
      return 'Problema de conexión. Por favor, comprueba tu conexión a internet.'
    }
    if (failure.kind === 'timeout') {
      return 'La solicitud ha expirado. Por favor, inténtalo de nuevo.'
    }
  }
  return 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.'
}
