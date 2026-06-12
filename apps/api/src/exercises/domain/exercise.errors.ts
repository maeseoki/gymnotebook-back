export class ExerciseApplicationError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ExerciseApplicationError'
  }
}

export class ExerciseNotFoundError extends ExerciseApplicationError {
  constructor() {
    super(404, 'exercise_not_found', 'Exercise not found')
    this.name = 'ExerciseNotFoundError'
  }
}

export class ImageNotAvailableError extends ExerciseApplicationError {
  constructor() {
    super(404, 'image_not_available', 'Image is not available')
    this.name = 'ImageNotAvailableError'
  }
}

export class ExerciseInUseError extends ExerciseApplicationError {
  constructor() {
    super(409, 'exercise_in_use', 'Exercise is referenced by workout history')
    this.name = 'ExerciseInUseError'
  }
}
