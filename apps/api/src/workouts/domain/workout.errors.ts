export class WorkoutApplicationError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'WorkoutApplicationError';
  }
}

export class WorkoutAlreadyExistsError extends WorkoutApplicationError {
  constructor() {
    super(409, 'workout_already_exists', 'Workout already exists');
    this.name = 'WorkoutAlreadyExistsError';
  }
}

export class WorkoutNotFoundError extends WorkoutApplicationError {
  constructor() {
    super(404, 'workout_not_found', 'Workout not found');
    this.name = 'WorkoutNotFoundError';
  }
}

export class WorkoutExerciseNotAvailableError extends WorkoutApplicationError {
  constructor() {
    super(404, 'workout_exercise_not_available', 'Workout exercise is not available');
    this.name = 'WorkoutExerciseNotAvailableError';
  }
}

export class InvalidWorkoutPeriodError extends WorkoutApplicationError {
  constructor() {
    super(400, 'invalid_workout_period', 'Workout end date must not precede start date');
    this.name = 'InvalidWorkoutPeriodError';
  }
}

export class InvalidWorkoutGroupPeriodError extends WorkoutApplicationError {
  constructor() {
    super(
      400,
      'invalid_workout_group_period',
      'Workout group end date must not precede start date',
    );
    this.name = 'InvalidWorkoutGroupPeriodError';
  }
}

export class InvalidWorkoutSetTimeError extends WorkoutApplicationError {
  constructor() {
    super(400, 'invalid_workout_set_time', 'Workout set timestamp is outside its containing range');
    this.name = 'InvalidWorkoutSetTimeError';
  }
}

export class InvalidTimezoneError extends WorkoutApplicationError {
  constructor() {
    super(400, 'invalid_timezone', 'Invalid timezone');
    this.name = 'InvalidTimezoneError';
  }
}
