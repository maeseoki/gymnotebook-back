import type { Exercise } from '../domain/exercise.js';
import type { ExerciseRepository } from '../domain/exercise.repository.js';

export async function listExercises(
  input: { userId: number },
  exercises: ExerciseRepository,
): Promise<Exercise[]> {
  return exercises.listByUser(input.userId);
}
