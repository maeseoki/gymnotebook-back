import type { WorkoutHistoryPage } from '@gymnotebook/contracts'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/client'
import { workoutsApi } from '../api/workouts-api'

/**
 * Custom hook to fetch the set history for a specific exercise.
 * Scoped by exerciseId and disabled when no exercise is selected.
 */
export function useExerciseSetHistory(exerciseId?: number, enabled = true) {
  const hasValidExerciseId = typeof exerciseId === 'number' && exerciseId > 0

  return useQuery<WorkoutHistoryPage, Error>({
    queryKey: hasValidExerciseId
      ? queryKeys.workouts.exerciseHistory(exerciseId)
      : (['mobile', 'workouts', 'exerciseHistory', null] as const),
    queryFn: async () => {
      if (!hasValidExerciseId) {
        throw new Error('El ID de ejercicio no es válido')
      }
      return workoutsApi.getExerciseHistory(exerciseId)
    },
    enabled: enabled && hasValidExerciseId,
  })
}
