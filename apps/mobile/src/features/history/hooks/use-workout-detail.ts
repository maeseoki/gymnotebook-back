import type { WorkoutResponse } from '@gymnotebook/contracts';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/query/client';
import { historyApi } from '../api/history-api';

/**
 * Custom hook to fetch the details of all workouts for a specific calendar date (YYYY-MM-DD).
 */
export function useWorkoutDetail(date: string) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return useQuery<WorkoutResponse[], Error>({
    queryKey: queryKeys.workouts.detail(date),
    queryFn: () => historyApi.getWorkoutsByDate(date, timezone),
    enabled: !!date,
  });
}
