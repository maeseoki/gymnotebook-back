import type { CreateExerciseRequest } from '@gymnotebook/contracts'
import { ImageNotAvailableError } from '../domain/exercise.errors.js'
import { type Exercise, type ExerciseDraft, normalizeExerciseInput } from '../domain/exercise.js'
import type { ExerciseRepository } from '../domain/exercise.repository.js'
import type { ExerciseImageAccess } from '../domain/exercise-image-access.js'

export interface CreateExerciseDeps {
  exercises: ExerciseRepository
  imageAccess: ExerciseImageAccess
}

export async function createExercise(
  input: CreateExerciseRequest & { userId: number },
  deps: CreateExerciseDeps,
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

  const draft: ExerciseDraft = {
    ...normalized,
    userId: input.userId,
  }
  return deps.exercises.create(draft)
}

export async function verifyImage(
  imageId: number | null,
  userId: number,
  imageAccess: ExerciseImageAccess,
): Promise<void> {
  if (imageId === null) {
    return
  }
  if (!(await imageAccess.isImageAvailableForUser(imageId, userId))) {
    throw new ImageNotAvailableError()
  }
}
