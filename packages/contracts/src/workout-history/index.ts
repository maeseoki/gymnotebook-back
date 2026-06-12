import { z } from 'zod'
import { NormalizedPaginationQuerySchema } from '../common/index.js'
import { WorkoutSetResponseSchema } from '../workouts/index.js'

export const WorkoutHistoryQuerySchema = NormalizedPaginationQuerySchema
export type WorkoutHistoryQuery = z.infer<typeof WorkoutHistoryQuerySchema>

export const WorkoutHistoryParamSchema = z.strictObject({
  exerciseId: z.coerce.number().int().positive(),
})
export type WorkoutHistoryParam = z.infer<typeof WorkoutHistoryParamSchema>

export const WorkoutHistoryPageSchema = z.strictObject({
  content: z.array(WorkoutSetResponseSchema),
  totalElements: z.number().int(),
  totalPages: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
})
export type WorkoutHistoryPage = z.infer<typeof WorkoutHistoryPageSchema>
