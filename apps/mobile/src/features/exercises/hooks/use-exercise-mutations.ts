import type { CreateExerciseRequest, UpdateExerciseRequest } from '@gymnotebook/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/query/client';
import { exercisesApi } from '../api/exercises-api';

export function useCreateExerciseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExerciseRequest) => exercisesApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.exercises.list });
    },
  });
}

export function useUpdateExerciseMutation(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateExerciseRequest) => exercisesApi.update(id, input),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.exercises.list });
      void queryClient.setQueryData(queryKeys.exercises.detail(id), data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.exercises.detail(id) });
    },
  });
}

export function useDeleteExerciseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => exercisesApi.delete(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.exercises.list });
      queryClient.removeQueries({ queryKey: queryKeys.exercises.detail(id) });
    },
  });
}
