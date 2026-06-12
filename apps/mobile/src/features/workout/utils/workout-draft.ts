import type { CreateWorkoutRequest } from '@gymnotebook/contracts';
import type { ActiveWorkoutDraft } from '../schemas/active-workout-draft';

/**
 * Maps the local ActiveWorkoutDraft structure to the CreateWorkoutRequest required by the backend API.
 * Weight is kept as grams and distance is kept as meters.
 */
export function mapDraftToCreateRequest(
  draft: ActiveWorkoutDraft,
  endDate?: string,
): CreateWorkoutRequest {
  const actualEndDate = endDate ?? new Date().toISOString();

  // Exclude empty exercises
  const workoutSets = draft.exercises
    .filter((ex) => ex.sets.length > 0)
    .map((ex) => ({
      exercise: { id: ex.exerciseId },
      startDate: draft.startedAt,
      endDate: actualEndDate,
      notes: null,
      sets: ex.sets.map((s) => ({
        reps: typeof s.reps === 'number' ? s.reps : 0,
        weight: typeof s.weightGrams === 'number' ? s.weightGrams : 0,
        time: typeof s.timeSeconds === 'number' ? s.timeSeconds : 0,
        distance: typeof s.distanceMeters === 'number' ? s.distanceMeters : 0,
        notes: null,
        isDropSet: false, // Defaulting as not requested/supported by UI
        startDate: s.createdAt,
      })),
    }));

  if (workoutSets.length === 0) {
    throw new Error('No se puede guardar un entrenamiento con cero series');
  }

  return {
    uuid: draft.id,
    startDate: draft.startedAt,
    endDate: actualEndDate,
    notes: null,
    workoutSets,
  };
}
