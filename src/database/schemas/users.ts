import { boolean, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { z } from 'zod';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 20 }).notNull().unique(),
  email: varchar('email', { length: 50 }).notNull().unique(),
  password: varchar('password', { length: 120 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 20 }).notNull().unique(), // ROLE_USER, ROLE_ADMIN, ROLE_MODERATOR
});

export const userRoles = pgTable('user_roles', {
  id: serial('id').primaryKey(),
  userId: serial('user_id')
    .references(() => users.id)
    .notNull(),
  roleId: serial('role_id')
    .references(() => roles.id)
    .notNull(),
});

// Zod schemas for validation (manual definitions)
export const insertUserSchema = z.object({
  username: z.string().min(1).max(20),
  email: z.string().email().max(50),
  password: z.string().min(6).max(120),
});

export const selectUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  password: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertRoleSchema = z.object({
  name: z.string().min(1).max(20),
});

export const selectRoleSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;
