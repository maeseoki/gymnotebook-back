import { decimal, integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { exercises } from './exercises';
import { users } from './users';

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
  weight: decimal('weight', { precision: 5, scale: 2 }), // for strength exercises
  duration: integer('duration'), // for time-based exercises (seconds)
  distance: decimal('distance', { precision: 8, scale: 2 }), // for cardio exercises
  orderIndex: integer('order_index').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Zod schemas (manual definitions)
export const insertWorkoutSchema = z.object({
  uuid: z.string().uuid(),
  userId: z.number(),
  notes: z.string().optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
});

export const selectWorkoutSchema = z.object({
  id: z.number(),
  uuid: z.string(),
  userId: z.number(),
  notes: z.string().nullable(),
  startDate: z.date(),
  endDate: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertWorkoutSetSchema = z.object({
  workoutId: z.number(),
  exerciseId: z.number(),
  orderIndex: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});

export const selectWorkoutSetSchema = z.object({
  id: z.number(),
  workoutId: z.number(),
  exerciseId: z.number(),
  orderIndex: z.number(),
  notes: z.string().nullable(),
  createdAt: z.date(),
});

export const insertSetSchema = z.object({
  workoutSetId: z.number(),
  reps: z.number().int().min(0),
  weight: z.string().optional(), // decimal as string
  duration: z.number().int().min(0).optional(),
  distance: z.string().optional(), // decimal as string
  orderIndex: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});

export const selectSetSchema = z.object({
  id: z.number(),
  workoutSetId: z.number(),
  reps: z.number(),
  weight: z.string().nullable(),
  duration: z.number().nullable(),
  distance: z.string().nullable(),
  orderIndex: z.number(),
  notes: z.string().nullable(),
  createdAt: z.date(),
});

export type Workout = typeof workouts.$inferSelect;
export type NewWorkout = typeof workouts.$inferInsert;
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type NewWorkoutSet = typeof workoutSets.$inferInsert;
export type Set = typeof sets.$inferSelect;
export type NewSet = typeof sets.$inferInsert;
