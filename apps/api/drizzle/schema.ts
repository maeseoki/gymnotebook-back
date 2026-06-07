import {
  bigint,
  boolean,
  customType,
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  tinyint,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

const mediumblob = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'mediumblob';
  },
});

export const roles = mysqlTable('roles', {
  id: tinyint('id').primaryKey().autoincrement(),
  name: mysqlEnum('name', ['ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ADMIN']).notNull().unique(),
});

export const users = mysqlTable(
  'users',
  {
    id: bigint('id', { mode: 'number', unsigned: false }).primaryKey().autoincrement(),
    username: varchar('username', { length: 20 }).notNull(),
    email: varchar('email', { length: 50 }).notNull(),
    password: varchar('password', { length: 120 }).notNull(),
  },
  (table) => ({
    usernameIdx: uniqueIndex('users_username_unique').on(table.username),
    emailIdx: uniqueIndex('users_email_unique').on(table.email),
  }),
);

export const userRoles = mysqlTable(
  'user_roles',
  {
    userId: bigint('user_id', { mode: 'number', unsigned: false })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: tinyint('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
  }),
);

export const imageData = mysqlTable('image_data', {
  id: bigint('id', { mode: 'number', unsigned: false }).primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  imageData: mediumblob('image_data').notNull(),
});

export const exercises = mysqlTable(
  'exercises',
  {
    id: bigint('id', { mode: 'number', unsigned: false }).primaryKey().autoincrement(),
    name: varchar('name', { length: 200 }).notNull(),
    imageId: bigint('image_id', { mode: 'number', unsigned: false }).references(
      () => imageData.id,
      {
        onDelete: 'set null',
      },
    ),
    description: varchar('description', { length: 500 }),
    type: mysqlEnum('type', [
      'WEIGHT',
      'REPS',
      'TIME',
      'DISTANCE',
      'WEIGHT_REPS',
      'TIME_DISTANCE',
    ]).notNull(),
    primaryMuscleGroup: mysqlEnum('primary_muscle_group', [
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
    ]).notNull(),
    secondaryMuscleGroup: mysqlEnum('secondary_muscle_group', [
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
    ]),
    userId: bigint('user_id', { mode: 'number', unsigned: false })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    userIdx: index('exercises_user_id_idx').on(table.userId),
  }),
);

export const workouts = mysqlTable(
  'workouts',
  {
    id: bigint('id', { mode: 'number', unsigned: false }).primaryKey().autoincrement(),
    uuid: varchar('uuid', { length: 36 }).notNull(),
    userId: bigint('user_id', { mode: 'number', unsigned: false })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    startDate: datetime('start_date', { mode: 'string' }).notNull(),
    endDate: datetime('end_date', { mode: 'string' }).notNull(),
    notes: varchar('notes', { length: 1000 }),
  },
  (table) => ({
    uuidIdx: uniqueIndex('workouts_uuid_unique').on(table.uuid),
    userDateIdx: index('workouts_user_date_idx').on(table.userId, table.startDate),
  }),
);

export const workoutSets = mysqlTable(
  'workout_sets',
  {
    id: bigint('id', { mode: 'number', unsigned: false }).primaryKey().autoincrement(),
    workoutId: bigint('workout_id', { mode: 'number', unsigned: false })
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    exerciseId: bigint('exercise_id', { mode: 'number', unsigned: false })
      .notNull()
      .references(() => exercises.id, { onDelete: 'restrict' }),
    startDate: datetime('start_date', { mode: 'string' }),
    endDate: datetime('end_date', { mode: 'string' }),
    notes: varchar('notes', { length: 1000 }),
  },
  (table) => ({
    exerciseIdx: index('workout_sets_exercise_id_idx').on(table.exerciseId),
    workoutIdx: index('workout_sets_workout_id_idx').on(table.workoutId),
  }),
);

export const sets = mysqlTable('sets', {
  id: bigint('id', { mode: 'number', unsigned: false }).primaryKey().autoincrement(),
  reps: int('reps').notNull().default(0),
  weight: int('weight').notNull().default(0),
  time: int('time').notNull().default(0),
  distance: int('distance').notNull().default(0),
  notes: varchar('notes', { length: 500 }),
  isDropSet: boolean('is_drop_set').notNull().default(false),
  workoutSetId: bigint('workout_set_id', { mode: 'number', unsigned: false })
    .notNull()
    .references(() => workoutSets.id, { onDelete: 'cascade' }),
  startDate: datetime('start_date', { mode: 'string' }),
});
