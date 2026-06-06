import type { EExerciseType, EMuscleGroup } from '@gymnotebook/contracts';

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

export interface CreateExerciseInput {
  name: string;
  description?: string | null;
  imageId?: number | null;
  type: EExerciseType;
  primaryMuscleGroup: EMuscleGroup;
  secondaryMuscleGroup?: EMuscleGroup | null;
  userId: number;
}

export interface ExerciseRepository {
  findByUserId(userId: number): Promise<Exercise[]>;
  findById(id: number): Promise<Exercise | null>;
  findByIdAndUserId(id: number, userId: number): Promise<Exercise | null>;
  create(input: CreateExerciseInput): Promise<Exercise>;
  update(id: number, input: Partial<CreateExerciseInput>): Promise<Exercise | null>;
  delete(id: number): Promise<void>;
  existsById(id: number): Promise<boolean>;
}
