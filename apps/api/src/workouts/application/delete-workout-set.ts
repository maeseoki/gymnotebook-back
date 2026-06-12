import { SetNotFoundError } from '../domain/workout.errors.js'
import type { WorkoutRepository } from '../domain/workout.repository.js'

export async function deleteWorkoutSet(
  input: { setId: number; userId: number },
  workouts: WorkoutRepository,
): Promise<void> {
  const result = await workouts.deleteSetForUser(input.setId, input.userId)
  if (!result.deleted) {
    throw new SetNotFoundError()
  }
}
