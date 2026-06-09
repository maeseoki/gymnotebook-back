import { and, asc, eq, gte, inArray, lt } from 'drizzle-orm';
import * as schema from '../../../drizzle/schema.js';
import type { Database } from '../../shared/db.js';
import type { DbExecutor, Transaction } from '../../shared/transaction.js';
import { inTransaction } from '../../shared/transaction.js';
import type {
  WorkoutCreated,
  WorkoutDraft,
  WorkoutGroupReadModel,
  WorkoutReadModel,
  WorkoutSetEntryReadModel,
} from '../domain/workout.js';
import type { WorkoutRepository } from '../domain/workout.repository.js';
import { mysqlUtcToIsoInstant } from '../domain/workout-dates.js';

export class DrizzleWorkoutRepository implements WorkoutRepository {
  constructor(private readonly db: DbExecutor) {}

  async createWorkoutGraph(input: WorkoutDraft): Promise<WorkoutCreated> {
    if (isDatabase(this.db)) {
      return inTransaction(this.db, (tx) => this.createWorkoutGraphInTransaction(tx, input));
    }
    return this.createWorkoutGraphInTransaction(this.db, input);
  }

  async listWorkoutStartDatesByUtcRange(input: {
    userId: number;
    start: string;
    end: string;
  }): Promise<string[]> {
    const rows = await this.db
      .select({ startDate: schema.workouts.startDate })
      .from(schema.workouts)
      .where(
        and(
          eq(schema.workouts.userId, input.userId),
          gte(schema.workouts.startDate, input.start),
          lt(schema.workouts.startDate, input.end),
        ),
      )
      .orderBy(asc(schema.workouts.startDate), asc(schema.workouts.id));
    return rows.flatMap((row) => (row.startDate ? [row.startDate] : []));
  }

  async getWorkoutGraphByUtcRange(input: {
    userId: number;
    start: string;
    end: string;
  }): Promise<WorkoutReadModel[]> {
    const workoutRows = await this.db
      .select()
      .from(schema.workouts)
      .where(
        and(
          eq(schema.workouts.userId, input.userId),
          gte(schema.workouts.startDate, input.start),
          lt(schema.workouts.startDate, input.end),
        ),
      )
      .orderBy(asc(schema.workouts.startDate), asc(schema.workouts.id));

    const workoutIds = workoutRows.map((workout) => workout.id);
    if (workoutIds.length === 0) {
      return [];
    }

    const groupRows = await this.db
      .select({
        group: schema.workoutSets,
        exercise: schema.exercises,
      })
      .from(schema.workoutSets)
      .innerJoin(schema.exercises, eq(schema.exercises.id, schema.workoutSets.exerciseId))
      .where(inArray(schema.workoutSets.workoutId, workoutIds))
      .orderBy(asc(schema.workoutSets.startDate), asc(schema.workoutSets.id));

    const groupIds = groupRows.map((row) => row.group.id);
    const setRows =
      groupIds.length === 0
        ? []
        : await this.db
            .select()
            .from(schema.sets)
            .where(inArray(schema.sets.workoutSetId, groupIds))
            .orderBy(asc(schema.sets.startDate), asc(schema.sets.id));

    const setsByGroupId = new Map<number, WorkoutSetEntryReadModel[]>();
    for (const row of setRows) {
      const entries = setsByGroupId.get(row.workoutSetId) ?? [];
      entries.push({
        id: row.id,
        reps: row.reps,
        weight: row.weight,
        time: row.time,
        distance: row.distance,
        notes: row.notes,
        isDropSet: row.isDropSet,
        startDate: mysqlUtcToIsoInstant(row.startDate),
      });
      setsByGroupId.set(row.workoutSetId, entries);
    }

    const groupsByWorkoutId = new Map<number, WorkoutGroupReadModel[]>();
    for (const row of groupRows) {
      const groups = groupsByWorkoutId.get(row.group.workoutId) ?? [];
      groups.push({
        id: row.group.id,
        workoutId: row.group.workoutId,
        startDate: mysqlUtcToIsoInstant(row.group.startDate),
        endDate: mysqlUtcToIsoInstant(row.group.endDate),
        notes: row.group.notes,
        exercise: {
          id: row.exercise.id,
          name: row.exercise.name,
          description: row.exercise.description,
          imageId: row.exercise.imageId,
          type: row.exercise.type,
          primaryMuscleGroup: row.exercise.primaryMuscleGroup,
          secondaryMuscleGroup: row.exercise.secondaryMuscleGroup,
        },
        sets: setsByGroupId.get(row.group.id) ?? [],
      });
      groupsByWorkoutId.set(row.group.workoutId, groups);
    }

    return workoutRows.map((row) => ({
      id: row.id,
      uuid: row.uuid,
      startDate: mysqlUtcToIsoInstant(row.startDate) ?? '',
      endDate: mysqlUtcToIsoInstant(row.endDate) ?? '',
      notes: row.notes,
      workoutSets: groupsByWorkoutId.get(row.id) ?? [],
    }));
  }

  private async createWorkoutGraphInTransaction(
    tx: Transaction,
    input: WorkoutDraft,
  ): Promise<WorkoutCreated> {
    const insertedWorkout = await tx
      .insert(schema.workouts)
      .values({
        uuid: input.uuid,
        userId: input.userId,
        startDate: input.startDate,
        endDate: input.endDate,
        notes: input.notes,
      })
      .$returningId();
    const workoutId = insertedWorkout[0]?.id;
    if (typeof workoutId !== 'number') {
      throw new Error('Failed to create workout');
    }

    if (input.groups.length === 0) {
      return { id: workoutId };
    }

    const insertedGroups = await tx
      .insert(schema.workoutSets)
      .values(
        input.groups.map((group) => ({
          workoutId,
          exerciseId: group.exerciseId,
          startDate: group.startDate,
          endDate: group.endDate,
          notes: group.notes,
        })),
      )
      .$returningId();

    const setValues = input.groups.flatMap((group, index) => {
      const workoutSetId = insertedGroups[index]?.id;
      if (typeof workoutSetId !== 'number') {
        throw new Error('Failed to create workout group');
      }
      return group.sets.map((set) => ({
        reps: set.reps,
        weight: set.weight,
        time: set.time,
        distance: set.distance,
        notes: set.notes,
        isDropSet: set.isDropSet,
        workoutSetId,
        startDate: set.startDate,
      }));
    });

    if (setValues.length > 0) {
      await tx.insert(schema.sets).values(setValues);
    }

    return { id: workoutId };
  }
}

function isDatabase(db: DbExecutor): db is Database {
  const maybeDatabase = db as Partial<Database>;
  return typeof maybeDatabase.transaction === 'function';
}
