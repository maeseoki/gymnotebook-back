import { WorkoutNotFoundError } from '../domain/workout.errors.js'
import type { WorkoutRepository } from '../domain/workout.repository.js'

export async function deleteWorkout(
  input: { workoutId: number; userId: number },
  workouts: WorkoutRepository,
): Promise<void> {
  const deleted = await workouts.deleteWorkoutForUser(input.workoutId, input.userId)
  if (!deleted) {
    throw new WorkoutNotFoundError()
  }
}
