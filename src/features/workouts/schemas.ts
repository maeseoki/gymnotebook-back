import { z } from 'zod';

export const createWorkoutSchema = z.object({
  notes: z.string().optional(),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format').optional(),
  workoutSets: z.array(
    z.object({
      exerciseId: z.number().int().positive('Exercise ID must be positive'),
      orderIndex: z.number().int().min(0, 'Order index must be non-negative').default(0),
      notes: z.string().optional(),
      sets: z.array(
        z.object({
          reps: z.number().int().min(0, 'Reps must be non-negative'),
          weight: z.number().min(0, 'Weight must be non-negative').optional(),
          duration: z.number().int().min(0, 'Duration must be non-negative').optional(),
          distance: z.number().min(0, 'Distance must be non-negative').optional(),
          orderIndex: z.number().int().min(0, 'Order index must be non-negative').default(0),
          notes: z.string().optional(),
        })
      ),
    })
  ),
});

export const workoutParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const getWorkoutsByDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

export const getWorkoutDaysSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(1900).max(2100),
});

export const getWorkoutsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CreateWorkoutRequest = z.infer<typeof createWorkoutSchema>;
export type WorkoutParams = z.infer<typeof workoutParamsSchema>;
export type GetWorkoutsByDateParams = z.infer<typeof getWorkoutsByDateSchema>;
export type GetWorkoutDaysParams = z.infer<typeof getWorkoutDaysSchema>;
export type GetWorkoutsQuery = z.infer<typeof getWorkoutsQuerySchema>;
