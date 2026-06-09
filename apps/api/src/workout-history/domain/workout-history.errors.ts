export class WorkoutHistoryApplicationError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'WorkoutHistoryApplicationError';
  }
}
