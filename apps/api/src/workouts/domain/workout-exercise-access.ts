export interface WorkoutExerciseAccess {
  countAvailableExercises(userId: number, exerciseIds: readonly number[]): Promise<number>;
}
