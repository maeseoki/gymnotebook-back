import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/client'
import { historyMutationsApi } from '../api/history-mutations-api'

export function useDeleteWorkout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (workoutId: number) => {
      return historyMutationsApi.deleteWorkout(workoutId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all })
    },
  })
}
