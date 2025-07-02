import { decimal, integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { exercises } from './exercises-schema';
import { users } from './users-schema';

export const workouts = pgTable('workouts', {
  id: serial('id').primaryKey(),
  uuid: varchar('uuid', { length: 36 }).notNull().unique(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  notes: text('notes'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const workoutSets = pgTable('workout_sets', {
  id: serial('id').primaryKey(),
  workoutId: integer('workout_id')
    .references(() => workouts.id)
    .notNull(),
  exerciseId: integer('exercise_id')
    .references(() => exercises.id)
    .notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sets = pgTable('sets', {
  id: serial('id').primaryKey(),
  workoutSetId: integer('workout_set_id')
    .references(() => workoutSets.id)
    .notNull(),
  reps: integer('reps').notNull(),
  weight: decimal('weight', { precision: 5, scale: 2 }),
  duration: integer('duration'),
  distance: decimal('distance', { precision: 8, scale: 2 }),
  orderIndex: integer('order_index').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
