import { z } from 'zod';

export const createExerciseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be at most 255 characters'),
  description: z.string().optional(),
  type: z.enum(['STRENGTH', 'CARDIO', 'FLEXIBILITY', 'BALANCE'], {
    required_error: 'Exercise type is required',
  }),
  primaryMuscleGroup: z.enum(
    [
      'CHEST',
      'BACK',
      'SHOULDERS',
      'BICEPS',
      'TRICEPS',
      'FOREARMS',
      'ABS',
      'QUADS',
      'HAMSTRINGS',
      'CALVES',
      'GLUTES',
    ],
    {
      required_error: 'Primary muscle group is required',
    }
  ),
  secondaryMuscleGroup: z
    .enum([
      'CHEST',
      'BACK',
      'SHOULDERS',
      'BICEPS',
      'TRICEPS',
      'FOREARMS',
      'ABS',
      'QUADS',
      'HAMSTRINGS',
      'CALVES',
      'GLUTES',
    ])
    .optional(),
  imageId: z.number().int().positive().optional(),
});

export const updateExerciseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be at most 255 characters'),
  description: z.string().optional(),
  type: z.enum(['STRENGTH', 'CARDIO', 'FLEXIBILITY', 'BALANCE'], {
    required_error: 'Exercise type is required',
  }),
  primaryMuscleGroup: z.enum(
    [
      'CHEST',
      'BACK',
      'SHOULDERS',
      'BICEPS',
      'TRICEPS',
      'FOREARMS',
      'ABS',
      'QUADS',
      'HAMSTRINGS',
      'CALVES',
      'GLUTES',
    ],
    {
      required_error: 'Primary muscle group is required',
    }
  ),
  secondaryMuscleGroup: z
    .enum([
      'CHEST',
      'BACK',
      'SHOULDERS',
      'BICEPS',
      'TRICEPS',
      'FOREARMS',
      'ABS',
      'QUADS',
      'HAMSTRINGS',
      'CALVES',
      'GLUTES',
    ])
    .optional(),
  imageId: z.number().int().positive().optional(),
});

export const exerciseParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const getExercisesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  type: z.enum(['STRENGTH', 'CARDIO', 'FLEXIBILITY', 'BALANCE']).optional(),
  primaryMuscleGroup: z
    .enum([
      'CHEST',
      'BACK',
      'SHOULDERS',
      'BICEPS',
      'TRICEPS',
      'FOREARMS',
      'ABS',
      'QUADS',
      'HAMSTRINGS',
      'CALVES',
      'GLUTES',
    ])
    .optional(),
});

export type CreateExerciseRequest = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseRequest = z.infer<typeof updateExerciseSchema>;
export type ExerciseParams = z.infer<typeof exerciseParamsSchema>;
export type GetExercisesQuery = z.infer<typeof getExercisesQuerySchema>;
