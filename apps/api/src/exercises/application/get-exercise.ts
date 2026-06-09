import { ExerciseNotFoundError } from '../domain/exercise.errors.js';
import type { Exercise } from '../domain/exercise.js';
import type { ExerciseRepository } from '../domain/exercise.repository.js';

export async function getExercise(
  input: { id: number; userId: number },
  exercises: ExerciseRepository,
): Promise<Exercise> {
  const exercise = await exercises.findByIdForUser(input.id, input.userId);
  if (!exercise) {
    throw new ExerciseNotFoundError();
  }
  return exercise;
}
