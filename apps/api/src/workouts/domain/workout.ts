import type { EExerciseType, EMuscleGroup, ExerciseResponse } from '@gymnotebook/contracts';

export interface WorkoutSetEntryDraft {
  reps: number;
  weight: number;
  time: number;
  distance: number;
  notes: string | null;
  isDropSet: boolean;
  startDate: string | null;
}

export interface WorkoutGroupDraft {
  exerciseId: number;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  sets: WorkoutSetEntryDraft[];
}

export interface WorkoutDraft {
  uuid: string;
  userId: number;
  startDate: string;
  endDate: string;
  notes: string | null;
  groups: WorkoutGroupDraft[];
}

export interface WorkoutCreated {
  id: number;
}

export interface WorkoutSetEntryReadModel {
  id: number;
  reps: number;
  weight: number;
  time: number;
  distance: number;
  notes: string | null;
  isDropSet: boolean;
  startDate: string | null;
}

export interface WorkoutExerciseReadModel {
  id: number;
  name: string;
  description: string | null;
  imageId: number | null;
  type: EExerciseType;
  primaryMuscleGroup: EMuscleGroup;
  secondaryMuscleGroup: EMuscleGroup | null;
}

export interface WorkoutGroupReadModel {
  id: number;
  workoutId: number;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  exercise: WorkoutExerciseReadModel;
  sets: WorkoutSetEntryReadModel[];
}

export interface WorkoutReadModel {
  id: number;
  uuid: string;
  startDate: string;
  endDate: string;
  notes: string | null;
  workoutSets: WorkoutGroupReadModel[];
}

export function toExerciseResponse(exercise: WorkoutExerciseReadModel): ExerciseResponse {
  return {
    id: exercise.id,
    name: exercise.name,
    description: exercise.description,
    imageId: exercise.imageId,
    type: exercise.type,
    primaryMuscleGroup: exercise.primaryMuscleGroup,
    secondaryMuscleGroup: exercise.secondaryMuscleGroup,
  };
}
