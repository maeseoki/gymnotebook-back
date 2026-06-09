import { ExerciseInUseError, ExerciseNotFoundError } from '../domain/exercise.errors.js';
import type { ExerciseRepository } from '../domain/exercise.repository.js';

export interface DeleteExerciseDeps {
  exercises: ExerciseRepository;
  isExerciseInUseError: (error: unknown) => boolean;
}

export async function deleteExercise(
  input: { id: number; userId: number },
  deps: DeleteExerciseDeps,
): Promise<void> {
  try {
    const deleted = await deps.exercises.deleteForUser(input.id, input.userId);
    if (!deleted) {
      throw new ExerciseNotFoundError();
    }
  } catch (error) {
    if (deps.isExerciseInUseError(error)) {
      throw new ExerciseInUseError();
    }
    throw error;
  }
}
