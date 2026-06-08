import type { WorkoutReadModel } from '../domain/workout.js';
import type { WorkoutRepository } from '../domain/workout.repository.js';
import { calendarDateUtcRange } from '../domain/workout-dates.js';

export async function getWorkoutsByDate(
  input: { userId: number; date: string; timezone: string },
  workouts: WorkoutRepository,
): Promise<WorkoutReadModel[]> {
  const range = calendarDateUtcRange(input.date, input.timezone);
  return workouts.getWorkoutGraphByUtcRange({
    userId: input.userId,
    start: range.start,
    end: range.end,
  });
}
