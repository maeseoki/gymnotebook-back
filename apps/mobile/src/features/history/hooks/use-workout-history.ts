import type { WorkoutResponse } from '@gymnotebook/contracts';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/query/client';
import { historyApi } from '../api/history-api';

/**
 * Custom hook to fetch the workout history for a specific month and year.
 * Aggregates workouts for each active workout day in the month.
 */
export function useWorkoutHistory(year: number, month: number) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return useQuery<WorkoutResponse[], Error>({
    queryKey: queryKeys.workouts.history(year, month),
    queryFn: async () => {
      // 1. Get days with workouts in the specified month/year
      const days = await historyApi.getWorkoutDays(month, year, timezone);
      if (days.length === 0) {
        return [];
      }

      // 2. Fetch workouts for all those days in parallel
      const workoutsPromises = days.map((day) => {
        const paddedMonth = String(month).padStart(2, '0');
        const paddedDay = String(day).padStart(2, '0');
        const dateStr = `${year}-${paddedMonth}-${paddedDay}`;
        return historyApi.getWorkoutsByDate(dateStr, timezone);
      });

      const workoutsGrouped = await Promise.all(workoutsPromises);
      const allWorkouts = workoutsGrouped.flat();

      // 3. Sort workouts descending by startDate (most recent first)
      return allWorkouts.sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      );
    },
  });
}
