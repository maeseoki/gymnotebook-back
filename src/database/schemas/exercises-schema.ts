import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { users } from './users-schema';

export const exerciseTypeEnum = pgEnum('exercise_type', [
  'STRENGTH',
  'CARDIO',
  'FLEXIBILITY',
  'BALANCE',
]);
export const muscleGroupEnum = pgEnum('muscle_group', [
  'CHEST',
  'BACK',
  'SHOULDERS',
  'BICEPS',
  'TRICEPS',
  'FOREARMS',
  'ABS',
  'QUADS',
  'HAMSTRINGS',
  'CALVES',
  'GLUTES',
]);

export const imageData = pgTable('image_data', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  imageData: text('image_data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const exercises = pgTable('exercises', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: exerciseTypeEnum('type').notNull(),
  primaryMuscleGroup: muscleGroupEnum('primary_muscle_group').notNull(),
  secondaryMuscleGroup: muscleGroupEnum('secondary_muscle_group'),
  imageId: integer('image_id').references(() => imageData.id),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
