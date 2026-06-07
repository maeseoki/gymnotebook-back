export interface ExerciseImageAccess {
  isImageAvailableForUser(imageId: number, userId: number): Promise<boolean>;
}
