import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { PaginatedResponseSchema } from './common/index.js'
import { UpdateWorkoutSetRequestSchema } from './workouts/index.js'

describe('common contract helpers', () => {
  it('builds paginated response schemas', () => {
    const schema = PaginatedResponseSchema(
      z.object({
        id: z.number().int(),
        name: z.string(),
      }),
    )

    expect(
      schema.parse({
        content: [{ id: 1, name: 'Bench Press' }],
        totalElements: 1,
        totalPages: 1,
        page: 0,
        size: 20,
      }),
    ).toEqual({
      content: [{ id: 1, name: 'Bench Press' }],
      totalElements: 1,
      totalPages: 1,
      page: 0,
      size: 20,
    })
  })
})

describe('workout mutation contracts', () => {
  it('rejects empty workout set update payloads', () => {
    expect(() => UpdateWorkoutSetRequestSchema.parse({})).toThrow(
      'At least one field must be provided',
    )
  })

  it('accepts partial workout set update payloads', () => {
    expect(UpdateWorkoutSetRequestSchema.parse({ weight: 82500 })).toEqual({
      weight: 82500,
    })
  })
})
