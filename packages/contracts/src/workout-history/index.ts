import { z } from 'zod';
import { PaginationQuerySchema } from '../common/index.js';
import { WorkoutSetResponseSchema } from '../workouts/index.js';

export const WorkoutHistoryQuerySchema = PaginationQuerySchema;
export type WorkoutHistoryQuery = z.infer<typeof WorkoutHistoryQuerySchema>;

export const WorkoutHistoryParamSchema = z.object({
  exerciseId: z.coerce.number().int().positive(),
});
export type WorkoutHistoryParam = z.infer<typeof WorkoutHistoryParamSchema>;

export const WorkoutHistoryPageSchema = z.object({
  content: z.array(WorkoutSetResponseSchema),
  totalElements: z.number().int(),
  totalPages: z.number().int(),
  page: z.number().int(),
  size: z.number().int(),
});
export type WorkoutHistoryPage = z.infer<typeof WorkoutHistoryPageSchema>;
