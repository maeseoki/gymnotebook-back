import type { UpdateWorkoutSetRequest } from '@gymnotebook/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/client'
import { historyMutationsApi } from '../api/history-mutations-api'

export function useUpdateHistorySet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ setId, payload }: { setId: number; payload: UpdateWorkoutSetRequest }) => {
      return historyMutationsApi.updateWorkoutSet(setId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all })
    },
  })
}
