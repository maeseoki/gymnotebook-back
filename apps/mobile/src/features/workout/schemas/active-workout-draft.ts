import { EExerciseTypeSchema } from '@gymnotebook/contracts'
import { z } from 'zod'

export const ActiveWorkoutSetSchema = z.strictObject({
  draftSetId: z.string(),
  weightGrams: z.number().int().min(0).nullable().optional(),
  reps: z.number().int().min(0).nullable().optional(),
  timeSeconds: z.number().int().min(0).nullable().optional(),
  distanceMeters: z.number().int().min(0).nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type ActiveWorkoutSet = z.infer<typeof ActiveWorkoutSetSchema>

export const ActiveWorkoutExerciseSchema = z.strictObject({
  draftExerciseId: z.string(),
  exerciseId: z.number().int().positive(),
  exerciseName: z.string(),
  exerciseType: EExerciseTypeSchema,
  sets: z.array(ActiveWorkoutSetSchema),
})

export type ActiveWorkoutExercise = z.infer<typeof ActiveWorkoutExerciseSchema>

export const ActiveWorkoutDraftSchema = z.strictObject({
  version: z.literal(1),
  id: z.string().uuid(),
  startedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  exercises: z.array(ActiveWorkoutExerciseSchema),
})

export type ActiveWorkoutDraft = z.infer<typeof ActiveWorkoutDraftSchema>

export const ActiveWorkoutEnvelopeSchema = z.strictObject({
  schemaVersion: z.literal(1),
  draft: ActiveWorkoutDraftSchema.nullable(),
  updatedAt: z.string().datetime(),
})

export type ActiveWorkoutEnvelope = z.infer<typeof ActiveWorkoutEnvelopeSchema>
