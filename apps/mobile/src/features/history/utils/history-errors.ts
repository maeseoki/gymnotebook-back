import type { ApiFailure } from '@/shared/api/errors';

/**
 * Maps an ApiFailure to a localized, user-friendly error message.
 * Does not expose raw stack traces.
 */
export function getHistoryErrorMessage(failure: ApiFailure): string {
  switch (failure.kind) {
    case 'network_unavailable':
      return 'No hay conexión a internet. Por favor, comprueba tu red.';
    case 'timeout':
      return 'La solicitud ha expirado. Inténtalo de nuevo.';
    case 'validation':
      return 'Error de formato de datos al recibir la información.';
    case 'backend':
      if (failure.status === 401) {
        return 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
      }
      if (failure.status === 404) {
        return 'El historial o día solicitado no fue encontrado.';
      }
      return failure.message || 'Error del servidor al obtener el historial.';
    default:
      return 'Ocurrió un error inesperado al cargar el historial.';
  }
}
