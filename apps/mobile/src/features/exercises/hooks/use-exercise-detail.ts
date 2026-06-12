import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/client'
import { exercisesApi } from '../api/exercises-api'

export function useExerciseDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.exercises.detail(id),
    queryFn: () => exercisesApi.get(id),
    enabled: !Number.isNaN(id) && id > 0,
  })
}
