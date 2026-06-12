import { describe, expect, it } from 'vitest'
import { IdParamSchema } from './common/index.js'
import {
  CreateExerciseRequestSchema,
  EExerciseTypeSchema,
  EMuscleGroupSchema,
} from './exercises/index.js'

const validExercise = {
  name: 'Bench press',
  description: 'Chest movement',
  imageId: 1,
  type: 'WEIGHT_REPS',
  primaryMuscleGroup: 'CHEST',
  secondaryMuscleGroup: 'TRICEPS',
} as const

describe('exercise contracts', () => {
  it('rejects blank and whitespace-only names', () => {
    expect(
      CreateExerciseRequestSchema.safeParse({ ...validExercise, name: '  Bench  ' }).success,
    ).toBe(true)
    expect(CreateExerciseRequestSchema.safeParse({ ...validExercise, name: '   ' }).success).toBe(
      false,
    )
  })

  it('validates name and description maximum lengths', () => {
    expect(
      CreateExerciseRequestSchema.safeParse({ ...validExercise, name: 'a'.repeat(200) }).success,
    ).toBe(true)
    expect(
      CreateExerciseRequestSchema.safeParse({ ...validExercise, name: 'a'.repeat(201) }).success,
    ).toBe(false)
    expect(
      CreateExerciseRequestSchema.safeParse({ ...validExercise, description: 'a'.repeat(500) })
        .success,
    ).toBe(true)
    expect(
      CreateExerciseRequestSchema.safeParse({ ...validExercise, description: 'a'.repeat(501) })
        .success,
    ).toBe(false)
  })

  it('accepts all valid exercise types and rejects invalid types', () => {
    for (const type of EExerciseTypeSchema.options) {
      expect(CreateExerciseRequestSchema.safeParse({ ...validExercise, type }).success).toBe(true)
    }
    expect(CreateExerciseRequestSchema.safeParse({ ...validExercise, type: 'POWER' }).success).toBe(
      false,
    )
  })

  it('accepts all valid muscle groups and rejects identical primary and secondary groups', () => {
    for (const primaryMuscleGroup of EMuscleGroupSchema.options) {
      expect(
        CreateExerciseRequestSchema.safeParse({
          ...validExercise,
          primaryMuscleGroup,
          secondaryMuscleGroup: null,
        }).success,
      ).toBe(true)
    }

    expect(
      CreateExerciseRequestSchema.safeParse({
        ...validExercise,
        primaryMuscleGroup: 'CHEST',
        secondaryMuscleGroup: 'CHEST',
      }).success,
    ).toBe(false)
  })

  it('normalizes optional nullable fields', () => {
    const parsed = CreateExerciseRequestSchema.parse({
      ...validExercise,
      description: '   ',
      imageId: null,
      secondaryMuscleGroup: null,
    })

    expect(parsed.description).toBeNull()
    expect(parsed.imageId).toBeNull()
    expect(parsed.secondaryMuscleGroup).toBeNull()
  })

  it('rejects unknown fields and invalid ids', () => {
    expect(CreateExerciseRequestSchema.safeParse({ ...validExercise, userId: 1 }).success).toBe(
      false,
    )
    expect(IdParamSchema.safeParse({ id: '1' }).success).toBe(true)
    expect(IdParamSchema.safeParse({ id: '0' }).success).toBe(false)
    expect(IdParamSchema.safeParse({ id: 'abc' }).success).toBe(false)
  })
})
