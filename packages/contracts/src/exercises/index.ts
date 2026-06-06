import { z } from 'zod';

export const EExerciseTypeSchema = z.enum([
  'WEIGHT',
  'REPS',
  'TIME',
  'DISTANCE',
  'WEIGHT_REPS',
  'TIME_DISTANCE',
]);
export type EExerciseType = z.infer<typeof EExerciseTypeSchema>;

export const EMuscleGroupSchema = z.enum([
  'ABDOMINALS',
  'ABDUCTORS',
  'BICEPS',
  'CALVES',
  'CARDIO',
  'CHEST',
  'FOREARMS',
  'FULL_BODY',
  'GLUTES',
  'HAMSTRINGS',
  'LATS',
  'LOWER_BACK',
  'QUADRICEPS',
  'SHOULDERS',
  'TRAPS',
  'TRICEPS',
  'UPPER_BACK',
  'OTHER',
]);
export type EMuscleGroup = z.infer<typeof EMuscleGroupSchema>;

export const CreateExerciseRequestSchema = z.object({
  name: z.string().min(1).max(200),
  imageId: z.number().int().positive().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  type: EExerciseTypeSchema,
  primaryMuscleGroup: EMuscleGroupSchema,
  secondaryMuscleGroup: EMuscleGroupSchema.optional().nullable(),
});
export type CreateExerciseRequest = z.infer<typeof CreateExerciseRequestSchema>;

export const UpdateExerciseRequestSchema = CreateExerciseRequestSchema;
export type UpdateExerciseRequest = z.infer<typeof UpdateExerciseRequestSchema>;

export const ExerciseResponseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string().nullable().optional(),
  imageId: z.number().int().nullable().optional(),
  type: EExerciseTypeSchema,
  primaryMuscleGroup: EMuscleGroupSchema,
  secondaryMuscleGroup: EMuscleGroupSchema.nullable().optional(),
});
export type ExerciseResponse = z.infer<typeof ExerciseResponseSchema>;
