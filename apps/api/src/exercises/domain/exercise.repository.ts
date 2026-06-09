import type { Exercise, ExerciseDraft, ExerciseUpdate } from './exercise.js';

export interface ExerciseRepository {
  findById(id: number): Promise<Exercise | null>;
  findByIdForUser(id: number, userId: number): Promise<Exercise | null>;
  listByUser(userId: number): Promise<Exercise[]>;
  create(input: ExerciseDraft): Promise<Exercise>;
  updateForUser(id: number, userId: number, input: ExerciseUpdate): Promise<Exercise | null>;
  deleteForUser(id: number, userId: number): Promise<boolean>;
}
