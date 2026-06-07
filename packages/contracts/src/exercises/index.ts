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

const ExerciseRequestBaseSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(200),
    imageId: z.number().int().positive().optional().nullable(),
    description: z
      .string()
      .trim()
      .max(500)
      .transform((value) => (value.length === 0 ? null : value))
      .optional()
      .nullable(),
    type: EExerciseTypeSchema,
    primaryMuscleGroup: EMuscleGroupSchema,
    secondaryMuscleGroup: EMuscleGroupSchema.optional().nullable(),
  })
  .refine(
    (value) =>
      value.secondaryMuscleGroup == null || value.secondaryMuscleGroup !== value.primaryMuscleGroup,
    {
      path: ['secondaryMuscleGroup'],
      message: 'Secondary muscle group must differ from primary muscle group',
    },
  );

export const CreateExerciseRequestSchema = ExerciseRequestBaseSchema;
export type CreateExerciseRequest = z.infer<typeof CreateExerciseRequestSchema>;

export const UpdateExerciseRequestSchema = ExerciseRequestBaseSchema;
export type UpdateExerciseRequest = z.infer<typeof UpdateExerciseRequestSchema>;

export const ExerciseResponseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string().nullable().optional(),
  imageId: z.number().int().positive().optional().nullable(),
  type: EExerciseTypeSchema,
  primaryMuscleGroup: EMuscleGroupSchema,
  secondaryMuscleGroup: EMuscleGroupSchema.optional().nullable(),
});
export type ExerciseResponse = z.infer<typeof ExerciseResponseSchema>;
