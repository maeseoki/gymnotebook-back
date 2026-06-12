import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/client'
import { exercisesApi } from '../api/exercises-api'

export function useExercises() {
  return useQuery({
    queryKey: queryKeys.exercises.list,
    queryFn: () => exercisesApi.list(),
  })
}
