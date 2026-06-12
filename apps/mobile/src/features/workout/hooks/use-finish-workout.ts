import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { workoutsApi } from '../api/workouts-api'
import { useWorkoutStore } from '../store/workout-store'

export function useFinishWorkout() {
  const clearWorkout = useWorkoutStore((s) => s.clearWorkout)
  const draft = useWorkoutStore((s) => s.draft)
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!draft) {
        throw new Error('No active workout draft to finish')
      }
      const totalSets = draft.exercises.reduce((acc, ex) => acc + ex.sets.length, 0)
      if (draft.exercises.length === 0 || totalSets === 0) {
        throw new Error('No se puede guardar un entrenamiento sin series registradas')
      }
      await workoutsApi.save(draft)
    },
    onSuccess: async () => {
      await clearWorkout()
      // Invalidate potential future query keys related to workouts/history
      await queryClient.invalidateQueries({
        queryKey: ['mobile', 'workouts'],
      })
      // Navigate to the history tab on success
      router.replace('/(authenticated)/(tabs)/history')
    },
  })
}
