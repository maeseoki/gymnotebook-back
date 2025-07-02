import { db } from '@/config/database';
import { type Exercise, type NewExercise, exercises, imageData } from '@/database/schemas';
import { AuthorizationError, NotFoundError, type PaginationParams } from '@/shared/types';
import { and, count, eq, or } from 'drizzle-orm';
import type {
  CreateExerciseRequest,
  ExerciseParams,
  GetExercisesQuery,
  UpdateExerciseRequest,
} from './schemas';

export class ExerciseService {
  async getExercises(userId: number, query: GetExercisesQuery) {
    const offset = (query.page - 1) * query.limit;

    // Build where conditions
    const whereConditions = [eq(exercises.userId, userId)];

    if (query.type) {
      whereConditions.push(eq(exercises.type, query.type));
    }

    if (query.primaryMuscleGroup) {
      whereConditions.push(eq(exercises.primaryMuscleGroup, query.primaryMuscleGroup));
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(exercises)
      .where(and(...whereConditions));
    const total = totalResult.count;

    // Get exercises with image data
    const exerciseResults = await db
      .select({
        exercise: exercises,
        image: imageData,
      })
      .from(exercises)
      .leftJoin(imageData, eq(exercises.imageId, imageData.id))
      .where(and(...whereConditions))
      .limit(query.limit)
      .offset(offset)
      .orderBy(exercises.name);

    const exercisesWithImages = exerciseResults.map((result) => ({
      id: result.exercise.id,
      name: result.exercise.name,
      description: result.exercise.description,
      type: result.exercise.type,
      primaryMuscleGroup: result.exercise.primaryMuscleGroup,
      secondaryMuscleGroup: result.exercise.secondaryMuscleGroup,
      imageId: result.exercise.imageId,
      createdAt: result.exercise.createdAt,
      updatedAt: result.exercise.updatedAt,
    }));

    return {
      exercises: exercisesWithImages,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    };
  }

  async getExerciseById(userId: number, exerciseId: number) {
    const exerciseResult = await db
      .select({
        exercise: exercises,
        image: imageData,
      })
      .from(exercises)
      .leftJoin(imageData, eq(exercises.imageId, imageData.id))
      .where(eq(exercises.id, exerciseId))
      .limit(1);

    if (exerciseResult.length === 0) {
      throw new NotFoundError('Exercise not found');
    }

    const exercise = exerciseResult[0].exercise;

    // Check ownership
    if (exercise.userId !== userId) {
      throw new AuthorizationError('You can only access your own exercises');
    }

    return {
      id: exercise.id,
      name: exercise.name,
      description: exercise.description,
      type: exercise.type,
      primaryMuscleGroup: exercise.primaryMuscleGroup,
      secondaryMuscleGroup: exercise.secondaryMuscleGroup,
      imageId: exercise.imageId,
      createdAt: exercise.createdAt,
      updatedAt: exercise.updatedAt,
    };
  }

  async createExercise(userId: number, data: CreateExerciseRequest) {
    // If imageId is provided, verify it exists
    if (data.imageId) {
      const imageExists = await db
        .select()
        .from(imageData)
        .where(eq(imageData.id, data.imageId))
        .limit(1);

      if (imageExists.length === 0) {
        throw new NotFoundError('Image not found');
      }
    }

    const newExercise: NewExercise = {
      name: data.name,
      description: data.description,
      type: data.type,
      primaryMuscleGroup: data.primaryMuscleGroup,
      secondaryMuscleGroup: data.secondaryMuscleGroup,
      imageId: data.imageId,
      userId,
    };

    const [createdExercise] = await db.insert(exercises).values(newExercise).returning();

    return createdExercise;
  }

  async updateExercise(userId: number, exerciseId: number, data: UpdateExerciseRequest) {
    // Check if exercise exists and user owns it
    const existingExercise = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, exerciseId))
      .limit(1);

    if (existingExercise.length === 0) {
      throw new NotFoundError('Exercise not found');
    }

    if (existingExercise[0].userId !== userId) {
      throw new AuthorizationError('You can only update your own exercises');
    }

    // If imageId is provided, verify it exists
    if (data.imageId) {
      const imageExists = await db
        .select()
        .from(imageData)
        .where(eq(imageData.id, data.imageId))
        .limit(1);

      if (imageExists.length === 0) {
        throw new NotFoundError('Image not found');
      }
    }

    const [updatedExercise] = await db
      .update(exercises)
      .set({
        name: data.name,
        description: data.description,
        type: data.type,
        primaryMuscleGroup: data.primaryMuscleGroup,
        secondaryMuscleGroup: data.secondaryMuscleGroup,
        imageId: data.imageId,
        updatedAt: new Date(),
      })
      .where(eq(exercises.id, exerciseId))
      .returning();

    return updatedExercise;
  }

  async deleteExercise(userId: number, exerciseId: number) {
    // Check if exercise exists and user owns it
    const existingExercise = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, exerciseId))
      .limit(1);

    if (existingExercise.length === 0) {
      throw new NotFoundError('Exercise not found');
    }

    if (existingExercise[0].userId !== userId) {
      throw new AuthorizationError('You can only delete your own exercises');
    }

    await db.delete(exercises).where(eq(exercises.id, exerciseId));

    return { success: true, message: 'Exercise deleted successfully' };
  }
}
