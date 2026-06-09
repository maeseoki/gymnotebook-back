import type { EExerciseType, EMuscleGroup } from '@gymnotebook/contracts';

export type { EExerciseType, EMuscleGroup };

export interface Exercise {
  id: number;
  name: string;
  description: string | null;
  imageId: number | null;
  type: EExerciseType;
  primaryMuscleGroup: EMuscleGroup;
  secondaryMuscleGroup: EMuscleGroup | null;
  userId: number;
}

export interface ExerciseDraft {
  name: string;
  description: string | null;
  imageId: number | null;
  type: EExerciseType;
  primaryMuscleGroup: EMuscleGroup;
  secondaryMuscleGroup: EMuscleGroup | null;
  userId: number;
}

export type ExerciseUpdate = Omit<ExerciseDraft, 'userId'>;

export function normalizeExerciseInput<T extends Omit<ExerciseDraft, 'userId'>>(input: T): T {
  return {
    ...input,
    name: input.name.trim(),
    description: normalizeOptionalText(input.description),
  };
}

function normalizeOptionalText(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
