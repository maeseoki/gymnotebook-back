import { z } from 'zod';
import { ExerciseResponseSchema } from '../exercises/index.js';

export const SetRequestSchema = z.object({
  reps: z.number().int().default(0),
  weight: z.number().int().default(0),
  time: z.number().int().default(0),
  distance: z.number().int().default(0),
  notes: z.string().optional().nullable(),
  isDropSet: z.boolean().default(false),
  startDate: z.string().datetime().optional().nullable(),
});
export type SetRequest = z.infer<typeof SetRequestSchema>;

export const ExerciseRefSchema = z.object({
  id: z.number().int().positive(),
});
export type ExerciseRef = z.infer<typeof ExerciseRefSchema>;

export const WorkoutSetRequestSchema = z.object({
  exercise: ExerciseRefSchema,
  sets: z.array(SetRequestSchema),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type WorkoutSetRequest = z.infer<typeof WorkoutSetRequestSchema>;

export const CreateWorkoutRequestSchema = z.object({
  uuid: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  workoutSets: z.array(WorkoutSetRequestSchema),
  notes: z.string().optional().nullable(),
});
export type CreateWorkoutRequest = z.infer<typeof CreateWorkoutRequestSchema>;

export const SetResponseSchema = z.object({
  id: z.number().int(),
  reps: z.number().int(),
  weight: z.number().int(),
  time: z.number().int(),
  distance: z.number().int(),
  notes: z.string().nullable().optional(),
  isDropSet: z.boolean(),
  startDate: z.string().nullable().optional(),
});
export type SetResponse = z.infer<typeof SetResponseSchema>;

export const WorkoutSetResponseSchema = z.object({
  id: z.number().int(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  exercise: ExerciseResponseSchema,
  sets: z.array(SetResponseSchema),
  notes: z.string().nullable().optional(),
});
export type WorkoutSetResponse = z.infer<typeof WorkoutSetResponseSchema>;

export const WorkoutResponseSchema = z.object({
  id: z.number().int(),
  uuid: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  notes: z.string().nullable().optional(),
  workoutSets: z.array(WorkoutSetResponseSchema),
});
export type WorkoutResponse = z.infer<typeof WorkoutResponseSchema>;

export const WorkoutDaysParamSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});
export type WorkoutDaysParam = z.infer<typeof WorkoutDaysParamSchema>;

export const WorkoutDateParamSchema = z.object({
  date: z.string(),
});
export type WorkoutDateParam = z.infer<typeof WorkoutDateParamSchema>;
