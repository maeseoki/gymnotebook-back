import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import type { AnyMySqlColumn } from 'drizzle-orm/mysql-core';
import * as schema from '../../../drizzle/schema.js';
import type { DbExecutor } from '../../shared/transaction.js';
import type {
  WorkoutGroupReadModel,
  WorkoutSetEntryReadModel,
} from '../../workouts/domain/workout.js';
import { mysqlUtcToIsoInstant } from '../../workouts/domain/workout-dates.js';
import type {
  WorkoutHistoryPageReadModel,
  WorkoutHistoryRepository,
  WorkoutHistorySortBy,
  WorkoutHistorySortDirection,
} from '../domain/workout-history.repository.js';

export class DrizzleWorkoutHistoryRepository implements WorkoutHistoryRepository {
  constructor(private readonly db: DbExecutor) {}

  async getExerciseHistoryPage(input: {
    userId: number;
    exerciseId: number;
    page: number;
    pageSize: number;
    sortBy: WorkoutHistorySortBy;
    sortDirection: WorkoutHistorySortDirection;
  }): Promise<WorkoutHistoryPageReadModel | null> {
    const exerciseRows = await this.db
      .select()
      .from(schema.exercises)
      .where(
        and(eq(schema.exercises.id, input.exerciseId), eq(schema.exercises.userId, input.userId)),
      )
      .limit(1);
    const exercise = exerciseRows[0];
    if (!exercise) {
      return null;
    }

    const [{ total = 0 } = { total: 0 }] = await this.db
      .select({ total: count() })
      .from(schema.workoutSets)
      .innerJoin(schema.workouts, eq(schema.workouts.id, schema.workoutSets.workoutId))
      .where(
        and(
          eq(schema.workoutSets.exerciseId, input.exerciseId),
          eq(schema.workouts.userId, input.userId),
        ),
      );

    const orderColumn = getSortColumn(input.sortBy);
    const direction = input.sortDirection === 'asc' ? asc : desc;
    const groupRows = await this.db
      .select({
        group: schema.workoutSets,
      })
      .from(schema.workoutSets)
      .innerJoin(schema.workouts, eq(schema.workouts.id, schema.workoutSets.workoutId))
      .where(
        and(
          eq(schema.workoutSets.exerciseId, input.exerciseId),
          eq(schema.workouts.userId, input.userId),
        ),
      )
      .orderBy(direction(orderColumn), direction(schema.workoutSets.id))
      .limit(input.pageSize)
      .offset(input.page * input.pageSize);

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

    return {
      content: groupRows.map<WorkoutGroupReadModel>((row) => ({
        id: row.group.id,
        workoutId: row.group.workoutId,
        startDate: mysqlUtcToIsoInstant(row.group.startDate),
        endDate: mysqlUtcToIsoInstant(row.group.endDate),
        notes: row.group.notes,
        exercise: {
          id: exercise.id,
          name: exercise.name,
          description: exercise.description,
          imageId: exercise.imageId,
          type: exercise.type,
          primaryMuscleGroup: exercise.primaryMuscleGroup,
          secondaryMuscleGroup: exercise.secondaryMuscleGroup,
        },
        sets: setsByGroupId.get(row.group.id) ?? [],
      })),
      totalElements: total,
      totalPages: Math.ceil(total / input.pageSize),
      page: input.page,
      pageSize: input.pageSize,
    };
  }
}

function getSortColumn(sortBy: WorkoutHistorySortBy): AnyMySqlColumn {
  if (sortBy === 'endDate') {
    return schema.workoutSets.endDate;
  }
  if (sortBy === 'id') {
    return schema.workoutSets.id;
  }
  return schema.workoutSets.startDate;
}
