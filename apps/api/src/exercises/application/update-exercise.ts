import type { UpdateExerciseRequest } from '@gymnotebook/contracts'
import { ExerciseNotFoundError } from '../domain/exercise.errors.js'
import { type Exercise, normalizeExerciseInput } from '../domain/exercise.js'
import type { ExerciseRepository } from '../domain/exercise.repository.js'
import type { ExerciseImageAccess } from '../domain/exercise-image-access.js'
import { verifyImage } from './create-exercise.js'

export interface UpdateExerciseDeps {
  exercises: ExerciseRepository
  imageAccess: ExerciseImageAccess
}

export async function updateExercise(
  input: UpdateExerciseRequest & { id: number; userId: number },
  deps: UpdateExerciseDeps,
): Promise<Exercise> {
  const normalized = normalizeExerciseInput({
    name: input.name,
    description: input.description ?? null,
    imageId: input.imageId ?? null,
    type: input.type,
    primaryMuscleGroup: input.primaryMuscleGroup,
    secondaryMuscleGroup: input.secondaryMuscleGroup ?? null,
  })

  await verifyImage(normalized.imageId, input.userId, deps.imageAccess)

  const updated = await deps.exercises.updateForUser(input.id, input.userId, normalized)
  if (!updated) {
    throw new ExerciseNotFoundError()
  }
  return updated
}
