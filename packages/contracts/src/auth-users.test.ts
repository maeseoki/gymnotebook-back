import { describe, expect, it } from 'vitest';
import { JwtResponseSchema, SignupRequestSchema } from './auth/index.js';
import { ModifyRoleRequestSchema, UserResponseSchema } from './users/index.js';

describe('auth and user contracts', () => {
  it('validates signup username length and alphanumeric rule', () => {
    expect(
      SignupRequestSchema.safeParse({
        username: 'abc',
        email: 'user@example.test',
        password: 'secret1',
      }).success,
    ).toBe(true);
    expect(
      SignupRequestSchema.safeParse({
        username: 'ab',
        email: 'user@example.test',
        password: 'secret1',
      }).success,
    ).toBe(false);
    expect(
      SignupRequestSchema.safeParse({
        username: 'abc!',
        email: 'user@example.test',
        password: 'secret1',
      }).success,
    ).toBe(false);
  });

  it('validates emails', () => {
    expect(
      SignupRequestSchema.safeParse({
        username: 'abc',
        email: 'user@example.test',
        password: 'secret1',
      }).success,
    ).toBe(true);
    expect(
      SignupRequestSchema.safeParse({ username: 'abc', email: 'not-email', password: 'secret1' })
        .success,
    ).toBe(false);
  });

  it('validates password limits', () => {
    expect(
      SignupRequestSchema.safeParse({
        username: 'abc',
        email: 'user@example.test',
        password: '12345',
      }).success,
    ).toBe(false);
    expect(
      SignupRequestSchema.safeParse({
        username: 'abc',
        email: 'user@example.test',
        password: 'a'.repeat(41),
      }).success,
    ).toBe(false);
  });

  it('rejects unexpected signup fields such as role', () => {
    expect(
      SignupRequestSchema.safeParse({
        username: 'abc',
        email: 'user@example.test',
        password: 'secret1',
        role: ['admin'],
      }).success,
    ).toBe(false);
  });

  it('validates role modification values', () => {
    expect(ModifyRoleRequestSchema.safeParse({ userId: 1, newRole: 'ROLE_ADMIN' }).success).toBe(
      true,
    );
    expect(
      ModifyRoleRequestSchema.safeParse({ userId: 1, newRole: 'ROLE_MODERATOR' }).success,
    ).toBe(true);
    expect(ModifyRoleRequestSchema.safeParse({ userId: 1, newRole: 'ROLE_USER' }).success).toBe(
      false,
    );
  });

  it('validates response roles', () => {
    expect(
      UserResponseSchema.safeParse({
        id: 1,
        username: 'abc',
        email: 'user@example.test',
        roles: ['ROLE_USER'],
      }).success,
    ).toBe(true);
    expect(
      UserResponseSchema.safeParse({
        id: 1,
        username: 'abc',
        email: 'user@example.test',
        roles: ['admin'],
      }).success,
    ).toBe(false);
    expect(
      JwtResponseSchema.safeParse({
        token: 'token',
        type: 'Bearer',
        id: 1,
        username: 'abc',
        email: 'user@example.test',
        roles: ['ROLE_USER'],
      }).success,
    ).toBe(true);
  });
});
