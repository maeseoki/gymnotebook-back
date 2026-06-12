import { CreateExerciseRequestSchema } from '@gymnotebook/contracts'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'

export const exerciseFormSchema = CreateExerciseRequestSchema
export type ExerciseFormValues = z.infer<typeof exerciseFormSchema>

export const exerciseFormResolver = zodResolver(exerciseFormSchema)
