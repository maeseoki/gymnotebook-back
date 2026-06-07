import {
  bigint,
  boolean,
  customType,
  datetime,
  index,
  int,
  mysqlTable,
  primaryKey,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

export const roleNames = ['ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ADMIN'] as const;
export type RoleName = (typeof roleNames)[number];

export const exerciseTypes = [
  'WEIGHT',
  'REPS',
  'TIME',
  'DISTANCE',
  'WEIGHT_REPS',
  'TIME_DISTANCE',
] as const;
export type ExerciseType = (typeof exerciseTypes)[number];

export const muscleGroups = [
  'ABDOMINALS',
  'ABDUCTORS',
  'BICEPS',
  'CALVES',
  'CARDIO',
  'CHEST',
  'FOREARMS',
  'FULL_BODY',
  'GLUTES',
  'HAMSTRINGS',
  'LATS',
  'LOWER_BACK',
  'QUADRICEPS',
  'SHOULDERS',
  'TRAPS',
  'TRICEPS',
  'UPPER_BACK',
  'OTHER',
] as const;
export type MuscleGroup = (typeof muscleGroups)[number];

const mediumblob = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'mediumblob';
  },
});

const id = (name = 'id') => bigint(name, { mode: 'number', unsigned: false });

export const roles = mysqlTable(
  'roles',
  {
    id: int('id').primaryKey().autoincrement(),
    name: varchar('name', { length: 20 }).notNull().$type<RoleName>(),
  },
  (table) => [uniqueIndex('roles_name_unique').on(table.name)],
);

export const users = mysqlTable(
  'users',
  {
    id: id().primaryKey().autoincrement(),
    username: varchar('username', { length: 20 }).notNull(),
    email: varchar('email', { length: 50 }).notNull(),
    password: varchar('password', { length: 120 }).notNull(),
  },
  (table) => [
    uniqueIndex('users_username_unique').on(table.username),
    uniqueIndex('users_email_unique').on(table.email),
  ],
);

export const userRoles = mysqlTable(
  'user_roles',
  {
    userId: id('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: int('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    index('user_roles_role_id_idx').on(table.roleId),
  ],
);

export const imageData = mysqlTable(
  'image_data',
  {
    id: id().primaryKey().autoincrement(),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 255 }).notNull(),
    imageData: mediumblob('image_data').notNull(),
    userId: id('user_id').references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => [index('image_data_user_id_idx').on(table.userId)],
);

export const exercises = mysqlTable(
  'exercises',
  {
    id: id().primaryKey().autoincrement(),
    name: varchar('name', { length: 255 }).notNull(),
    imageId: id('image_id').references(() => imageData.id, { onDelete: 'set null' }),
    description: varchar('description', { length: 255 }),
    type: varchar('type', { length: 255 }).notNull().$type<ExerciseType>(),
    primaryMuscleGroup: varchar('primary_muscle_group', { length: 255 })
      .notNull()
      .$type<MuscleGroup>(),
    secondaryMuscleGroup: varchar('secondary_muscle_group', { length: 255 }).$type<MuscleGroup>(),
    userId: id('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('exercises_user_id_idx').on(table.userId),
    index('exercises_image_id_idx').on(table.imageId),
  ],
);

export const workouts = mysqlTable(
  'workouts',
  {
    id: id().primaryKey().autoincrement(),
    uuid: varchar('uuid', { length: 255 }).notNull(),
    userId: id('user_id').references(() => users.id, { onDelete: 'cascade' }),
    startDate: datetime('start_date', { mode: 'string' }),
    endDate: datetime('end_date', { mode: 'string' }),
    notes: varchar('notes', { length: 255 }),
  },
  (table) => [
    uniqueIndex('workouts_uuid_unique').on(table.uuid),
    index('workouts_user_start_date_idx').on(table.userId, table.startDate),
  ],
);

export const workoutSets = mysqlTable(
  'workout_sets',
  {
    id: id().primaryKey().autoincrement(),
    workoutId: id('workout_id')
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    exerciseId: id('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'restrict' }),
    startDate: datetime('start_date', { mode: 'string' }),
    endDate: datetime('end_date', { mode: 'string' }),
    notes: varchar('notes', { length: 255 }),
  },
  (table) => [
    index('workout_sets_workout_id_idx').on(table.workoutId),
    index('workout_sets_exercise_id_idx').on(table.exerciseId),
  ],
);

export const sets = mysqlTable(
  'sets',
  {
    id: id().primaryKey().autoincrement(),
    reps: int('reps').notNull(),
    weight: int('weight').notNull(),
    time: int('time').notNull(),
    distance: int('distance').notNull(),
    notes: varchar('notes', { length: 255 }),
    isDropSet: boolean('is_drop_set').notNull(),
    workoutSetId: id('workout_set_id')
      .notNull()
      .references(() => workoutSets.id, { onDelete: 'cascade' }),
    startDate: datetime('start_date', { mode: 'string' }),
  },
  (table) => [index('sets_workout_set_id_idx').on(table.workoutSetId)],
);
