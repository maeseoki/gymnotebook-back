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
        return 'Session expired. Please sign in again.'
      }
      if (failure.status === 404) {
        return 'Exercise not found.'
      }
      if (failure.status === 409) {
        return failure.message || 'This exercise cannot be deleted because it is currently in use.'
      }
      return failure.message || 'A server error occurred.'
    }
    if (failure.kind === 'validation') {
      return failure.message || 'Validation error.'
    }
    if (failure.kind === 'network_unavailable') {
      return 'Connection problem. Please check your internet connection.'
    }
    if (failure.kind === 'timeout') {
      return 'The request timed out. Please try again.'
    }
  }
  return 'An unexpected error occurred. Please try again.'
}
