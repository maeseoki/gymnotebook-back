import type { WorkoutHistoryQuery } from '@gymnotebook/contracts';
import { ExerciseNotFoundError } from '../../exercises/domain/exercise.errors.js';
import type {
  WorkoutHistoryPageReadModel,
  WorkoutHistoryRepository,
} from '../domain/workout-history.repository.js';

export async function getExerciseHistory(
  input: WorkoutHistoryQuery & { userId: number; exerciseId: number },
  history: WorkoutHistoryRepository,
): Promise<WorkoutHistoryPageReadModel> {
  const page = await history.getExerciseHistoryPage(input);
  if (!page) {
    throw new ExerciseNotFoundError();
  }
  return page;
}
