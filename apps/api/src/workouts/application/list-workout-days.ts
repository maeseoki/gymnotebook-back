import type { WorkoutRepository } from '../domain/workout.repository.js'
import { calendarMonthUtcRange, mysqlUtcDayOfMonth } from '../domain/workout-dates.js'

export async function listWorkoutDays(
  input: { userId: number; month: number; year: number; timezone: string },
  workouts: WorkoutRepository,
): Promise<number[]> {
  const range = calendarMonthUtcRange(input.year, input.month, input.timezone)
  const startDates = await workouts.listWorkoutStartDatesByUtcRange({
    userId: input.userId,
    start: range.start,
    end: range.end,
  })
  return [...new Set(startDates.map((value) => mysqlUtcDayOfMonth(value, input.timezone)))].sort(
    (left, right) => left - right,
  )
}
