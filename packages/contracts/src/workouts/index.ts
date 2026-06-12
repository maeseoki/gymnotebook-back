import { z } from 'zod'
import { CalendarDateSchema, IsoInstantStringSchema } from '../common/index.js'
import { ExerciseResponseSchema } from '../exercises/index.js'

const NullableNotesSchema = z.string().trim().max(255).optional().nullable()

export const SetRequestSchema = z.strictObject({
  reps: z.number().int().min(0).default(0),
  weight: z.number().int().min(0).default(0),
  time: z.number().int().min(0).default(0),
  distance: z.number().int().min(0).default(0),
  notes: NullableNotesSchema,
  isDropSet: z.boolean().default(false),
  startDate: IsoInstantStringSchema.optional().nullable(),
})
export type SetRequest = z.infer<typeof SetRequestSchema>

export const ExerciseRefSchema = z.strictObject({
  id: z.number().int().positive(),
})
export type ExerciseRef = z.infer<typeof ExerciseRefSchema>

export const WorkoutSetRequestSchema = z.strictObject({
  exercise: ExerciseRefSchema,
  sets: z.array(SetRequestSchema),
  startDate: IsoInstantStringSchema.optional().nullable(),
  endDate: IsoInstantStringSchema.optional().nullable(),
  notes: NullableNotesSchema,
})
export type WorkoutSetRequest = z.infer<typeof WorkoutSetRequestSchema>

export const CreateWorkoutRequestSchema = z.strictObject({
  uuid: z.uuid(),
  startDate: IsoInstantStringSchema,
  endDate: IsoInstantStringSchema,
  workoutSets: z.array(WorkoutSetRequestSchema),
  notes: NullableNotesSchema,
})
export type CreateWorkoutRequest = z.infer<typeof CreateWorkoutRequestSchema>

export const SetResponseSchema = z.strictObject({
  id: z.number().int(),
  reps: z.number().int().min(0),
  weight: z.number().int().min(0),
  time: z.number().int().min(0),
  distance: z.number().int().min(0),
  notes: z.string().nullable().optional(),
  isDropSet: z.boolean(),
  startDate: IsoInstantStringSchema.nullable().optional(),
})
export type SetResponse = z.infer<typeof SetResponseSchema>

export const WorkoutSetResponseSchema = z.strictObject({
  id: z.number().int(),
  startDate: IsoInstantStringSchema.nullable().optional(),
  endDate: IsoInstantStringSchema.nullable().optional(),
  exercise: ExerciseResponseSchema,
  sets: z.array(SetResponseSchema),
  notes: z.string().nullable().optional(),
})
export type WorkoutSetResponse = z.infer<typeof WorkoutSetResponseSchema>

export const WorkoutResponseSchema = z.strictObject({
  id: z.number().int(),
  uuid: z.uuid(),
  startDate: IsoInstantStringSchema,
  endDate: IsoInstantStringSchema,
  notes: z.string().nullable().optional(),
  workoutSets: z.array(WorkoutSetResponseSchema),
})
export type WorkoutResponse = z.infer<typeof WorkoutResponseSchema>

export const WorkoutDaysParamSchema = z.strictObject({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
})
export type WorkoutDaysParam = z.infer<typeof WorkoutDaysParamSchema>

export const WorkoutDateParamSchema = z.strictObject({
  date: CalendarDateSchema,
})
export type WorkoutDateParam = z.infer<typeof WorkoutDateParamSchema>

export const WorkoutTimezoneQuerySchema = z.strictObject({
  timezone: z.string().optional(),
})
export type WorkoutTimezoneQuery = z.infer<typeof WorkoutTimezoneQuerySchema>

export const UpdateWorkoutSetRequestSchema = z
  .strictObject({
    reps: z.number().int().min(0).optional(),
    weight: z.number().int().min(0).optional(),
    time: z.number().int().min(0).optional(),
    distance: z.number().int().min(0).optional(),
    notes: z.string().trim().max(255).optional().nullable(),
    isDropSet: z.boolean().optional(),
    startDate: IsoInstantStringSchema.optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  })
export type UpdateWorkoutSetRequest = z.infer<typeof UpdateWorkoutSetRequestSchema>

export const UpdateWorkoutSetResponseSchema = SetResponseSchema
export type UpdateWorkoutSetResponse = z.infer<typeof UpdateWorkoutSetResponseSchema>

export const DeleteWorkoutResponseSchema = z.null()
export type DeleteWorkoutResponse = z.infer<typeof DeleteWorkoutResponseSchema>

export const DeleteWorkoutSetResponseSchema = z.null()
export type DeleteWorkoutSetResponse = z.infer<typeof DeleteWorkoutSetResponseSchema>
