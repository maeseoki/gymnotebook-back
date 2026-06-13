import type { ApiFailure } from '@/shared/api/errors'
import i18n from '@/shared/i18n'
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
        return i18n.t('exercisesScreen.errors.sessionExpired')
      }
      if (failure.status === 404) {
        return i18n.t('exercisesScreen.errors.notFound')
      }
      if (failure.status === 409) {
        return failure.message || i18n.t('exercisesScreen.errors.conflict')
      }
      return failure.message || i18n.t('exercisesScreen.errors.serverError')
    }
    if (failure.kind === 'validation') {
      return failure.message || i18n.t('exercisesScreen.errors.validationError')
    }
    if (failure.kind === 'network_unavailable') {
      return i18n.t('exercisesScreen.errors.networkError')
    }
    if (failure.kind === 'timeout') {
      return i18n.t('exercisesScreen.errors.timeoutError')
    }
  }
  return i18n.t('exercisesScreen.errors.unexpectedError')
}
