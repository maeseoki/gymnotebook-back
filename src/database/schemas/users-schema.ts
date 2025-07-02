import { pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

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
  name: varchar('name', { length: 20 }).notNull().unique(),
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
