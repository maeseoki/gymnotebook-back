import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/client'
import { historyMutationsApi } from '../api/history-mutations-api'

export function useDeleteHistorySet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (setId: number) => {
      return historyMutationsApi.deleteWorkoutSet(setId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all })
    },
  })
}
