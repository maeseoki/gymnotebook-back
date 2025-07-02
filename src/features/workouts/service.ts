import { db } from '@/config/database';
import {
  type NewSet,
  type NewWorkout,
  type NewWorkoutSet,
  exercises,
  sets,
  workoutSets,
  workouts,
} from '@/database/schemas';
import { AuthorizationError, NotFoundError, ValidationError } from '@/shared/types';
import { generateUUID } from '@/shared/utils';
import { and, count, eq, gte, lte, sql } from 'drizzle-orm';
import type {
  CreateWorkoutRequest,
  GetWorkoutDaysParams,
  GetWorkoutsByDateParams,
  GetWorkoutsQuery,
  WorkoutParams,
} from './schemas';

export class WorkoutService {
  async getWorkouts(userId: number, query: GetWorkoutsQuery) {
    const offset = (query.page - 1) * query.limit;

    // Build where conditions
    const whereConditions = [eq(workouts.userId, userId)];

    if (query.startDate) {
      whereConditions.push(gte(workouts.startDate, new Date(query.startDate)));
    }

    if (query.endDate) {
      whereConditions.push(lte(workouts.startDate, new Date(query.endDate)));
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(workouts)
      .where(and(...whereConditions));
    const total = totalResult.count;

    // Get workouts with their sets and exercises
    const workoutResults = await db
      .select({
        workout: workouts,
        workoutSet: workoutSets,
        exercise: exercises,
        set: sets,
      })
      .from(workouts)
      .leftJoin(workoutSets, eq(workouts.id, workoutSets.workoutId))
      .leftJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
      .leftJoin(sets, eq(workoutSets.id, sets.workoutSetId))
      .where(and(...whereConditions))
      .limit(query.limit)
      .offset(offset)
      .orderBy(workouts.startDate);

    // Group results by workout
    const workoutMap = new Map<
      number,
      {
        id: number;
        uuid: string;
        userId: number;
        notes: string | null;
        startDate: Date;
        endDate: Date | null;
        createdAt: Date;
        updatedAt: Date;
        workoutSets: Map<number, any>;
      }
    >();
    for (const result of workoutResults) {
      const workoutId = result.workout.id;
      if (!workoutMap.has(workoutId)) {
        workoutMap.set(workoutId, {
          ...result.workout,
          workoutSets: new Map(),
        });
      }

      if (result.workoutSet && result.exercise) {
        const workoutSetId = result.workoutSet.id;
        const workout = workoutMap.get(workoutId)!;
        if (!workout.workoutSets.has(workoutSetId)) {
          workout.workoutSets.set(workoutSetId, {
            ...result.workoutSet,
            exercise: result.exercise,
            sets: [],
          });
        }

        if (result.set) {
          workout.workoutSets.get(workoutSetId)!.sets.push(result.set);
        }
      }
    }

    // Convert maps to arrays
    const workoutsData = Array.from(workoutMap.values()).map((workout) => ({
      ...workout,
      workoutSets: Array.from(workout.workoutSets.values()),
    }));

    return {
      workouts: workoutsData,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    };
  }

  async getWorkoutById(userId: number, workoutId: number) {
    const workoutResults = await db
      .select({
        workout: workouts,
        workoutSet: workoutSets,
        exercise: exercises,
        set: sets,
      })
      .from(workouts)
      .leftJoin(workoutSets, eq(workouts.id, workoutSets.workoutId))
      .leftJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
      .leftJoin(sets, eq(workoutSets.id, sets.workoutSetId))
      .where(eq(workouts.id, workoutId));

    if (workoutResults.length === 0) {
      throw new NotFoundError('Workout not found');
    }

    const workout = workoutResults[0].workout;

    // Check ownership
    if (workout.userId !== userId) {
      throw new AuthorizationError('You can only access your own workouts');
    }

    // Group workout sets
    const workoutSetMap = new Map<
      number,
      {
        id: number;
        workoutId: number;
        exerciseId: number;
        orderIndex: number;
        notes: string | null;
        createdAt: Date;
        exercise: any;
        sets: any[];
      }
    >();
    for (const result of workoutResults) {
      if (result.workoutSet && result.exercise) {
        const workoutSetId = result.workoutSet.id;
        if (!workoutSetMap.has(workoutSetId)) {
          workoutSetMap.set(workoutSetId, {
            ...result.workoutSet,
            exercise: result.exercise,
            sets: [],
          });
        }

        if (result.set) {
          workoutSetMap.get(workoutSetId)!.sets.push(result.set);
        }
      }
    }

    return {
      ...workout,
      workoutSets: Array.from(workoutSetMap.values()),
    };
  }

  async getWorkoutsByDate(userId: number, params: GetWorkoutsByDateParams) {
    const startOfDay = new Date(`${params.date}T00:00:00.000Z`);
    const endOfDay = new Date(`${params.date}T23:59:59.999Z`);

    const workoutResults = await db
      .select()
      .from(workouts)
      .where(
        and(
          eq(workouts.userId, userId),
          gte(workouts.startDate, startOfDay),
          lte(workouts.startDate, endOfDay)
        )
      )
      .orderBy(workouts.startDate);

    return workoutResults;
  }

  async getWorkoutDays(userId: number, params: GetWorkoutDaysParams) {
    const startDate = new Date(params.year, params.month - 1, 1);
    const endDate = new Date(params.year, params.month, 0, 23, 59, 59, 999);

    const workoutDays = await db
      .select({
        day: sql<number>`EXTRACT(DAY FROM ${workouts.startDate})`,
      })
      .from(workouts)
      .where(
        and(
          eq(workouts.userId, userId),
          gte(workouts.startDate, startDate),
          lte(workouts.startDate, endDate)
        )
      )
      .groupBy(sql`EXTRACT(DAY FROM ${workouts.startDate})`);

    return workoutDays.map((result) => result.day);
  }

  async createWorkout(userId: number, data: CreateWorkoutRequest) {
    return await db.transaction(async (tx) => {
      // Create workout
      const newWorkout: NewWorkout = {
        uuid: generateUUID(),
        userId,
        notes: data.notes,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
      };

      const [createdWorkout] = await tx.insert(workouts).values(newWorkout).returning();

      // Create workout sets and sets
      for (const workoutSetData of data.workoutSets) {
        // Verify exercise exists and belongs to user
        const exerciseResult = await tx
          .select()
          .from(exercises)
          .where(eq(exercises.id, workoutSetData.exerciseId))
          .limit(1);

        if (exerciseResult.length === 0) {
          throw new NotFoundError('Exercise not found');
        }

        if (exerciseResult[0].userId !== userId) {
          throw new AuthorizationError('You can only use your own exercises');
        }

        // Create workout set
        const newWorkoutSet: NewWorkoutSet = {
          workoutId: createdWorkout.id,
          exerciseId: workoutSetData.exerciseId,
          orderIndex: workoutSetData.orderIndex || 0,
          notes: workoutSetData.notes,
        };

        const [createdWorkoutSet] = await tx.insert(workoutSets).values(newWorkoutSet).returning();

        // Create sets
        for (const setData of workoutSetData.sets) {
          const newSet: NewSet = {
            workoutSetId: createdWorkoutSet.id,
            reps: setData.reps,
            weight: setData.weight?.toString(),
            duration: setData.duration,
            distance: setData.distance?.toString(),
            orderIndex: setData.orderIndex || 0,
            notes: setData.notes,
          };

          await tx.insert(sets).values(newSet);
        }
      }

      return createdWorkout;
    });
  }

  async deleteWorkout(userId: number, workoutId: number) {
    // Check if workout exists and user owns it
    const existingWorkout = await db
      .select()
      .from(workouts)
      .where(eq(workouts.id, workoutId))
      .limit(1);

    if (existingWorkout.length === 0) {
      throw new NotFoundError('Workout not found');
    }

    if (existingWorkout[0].userId !== userId) {
      throw new AuthorizationError('You can only delete your own workouts');
    }

    await db.delete(workouts).where(eq(workouts.id, workoutId));

    return { success: true, message: 'Workout deleted successfully' };
  }
}
