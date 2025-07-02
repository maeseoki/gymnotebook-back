import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { users } from './users';

// Enums matching the Java enums
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
  imageData: text('image_data').notNull(), // base64 encoded
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

// Zod schemas (manual definitions)
export const insertExerciseSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(['STRENGTH', 'CARDIO', 'FLEXIBILITY', 'BALANCE']),
  primaryMuscleGroup: z.enum([
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
  ]),
  secondaryMuscleGroup: z
    .enum([
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
    ])
    .optional(),
  imageId: z.number().optional(),
  userId: z.number(),
});

export const selectExerciseSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.enum(['STRENGTH', 'CARDIO', 'FLEXIBILITY', 'BALANCE']),
  primaryMuscleGroup: z.enum([
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
  ]),
  secondaryMuscleGroup: z
    .enum([
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
    ])
    .nullable(),
  imageId: z.number().nullable(),
  userId: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertImageDataSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(100),
  imageData: z.string().min(1),
});

export const selectImageDataSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  imageData: z.string(),
  createdAt: z.date(),
});

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type ImageData = typeof imageData.$inferSelect;
export type NewImageData = typeof imageData.$inferInsert;
