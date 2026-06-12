import { describe, expect, it } from 'vitest'
import {
  JwtResponseSchema,
  MobileLogoutRequestSchema,
  MobileRefreshRequestSchema,
  MobileRevokeAllSessionsQuerySchema,
  MobileRevokeAllSessionsResponseSchema,
  MobileSessionResponseSchema,
  MobileSignInRequestSchema,
  MobileSignUpRequestSchema,
  MobileTokenPairResponseSchema,
  SignupRequestSchema,
} from './auth/index.js'
import { ModifyRoleRequestSchema, UserResponseSchema } from './users/index.js'

describe('auth and user contracts', () => {
  it('validates signup username length and alphanumeric rule', () => {
    expect(
      SignupRequestSchema.safeParse({
        username: 'abc',
        email: 'user@example.test',
        password: 'secret1',
      }).success,
    ).toBe(true)
    expect(
      SignupRequestSchema.safeParse({
        username: 'ab',
        email: 'user@example.test',
        password: 'secret1',
      }).success,
    ).toBe(false)
    expect(
      SignupRequestSchema.safeParse({
        username: 'abc!',
        email: 'user@example.test',
        password: 'secret1',
      }).success,
    ).toBe(false)
  })

  it('validates emails', () => {
    expect(
      SignupRequestSchema.safeParse({
        username: 'abc',
        email: 'user@example.test',
        password: 'secret1',
      }).success,
    ).toBe(true)
    expect(
      SignupRequestSchema.safeParse({ username: 'abc', email: 'not-email', password: 'secret1' })
        .success,
    ).toBe(false)
  })

  it('validates password limits', () => {
    expect(
      SignupRequestSchema.safeParse({
        username: 'abc',
        email: 'user@example.test',
        password: '12345',
      }).success,
    ).toBe(false)
    expect(
      SignupRequestSchema.safeParse({
        username: 'abc',
        email: 'user@example.test',
        password: 'a'.repeat(41),
      }).success,
    ).toBe(false)
  })

  it('rejects unexpected signup fields such as role', () => {
    expect(
      SignupRequestSchema.safeParse({
        username: 'abc',
        email: 'user@example.test',
        password: 'secret1',
        role: ['admin'],
      }).success,
    ).toBe(false)
  })

  it('validates role modification values', () => {
    expect(ModifyRoleRequestSchema.safeParse({ userId: 1, newRole: 'ROLE_ADMIN' }).success).toBe(
      true,
    )
    expect(
      ModifyRoleRequestSchema.safeParse({ userId: 1, newRole: 'ROLE_MODERATOR' }).success,
    ).toBe(true)
    expect(ModifyRoleRequestSchema.safeParse({ userId: 1, newRole: 'ROLE_USER' }).success).toBe(
      false,
    )
  })

  it('validates response roles', () => {
    expect(
      UserResponseSchema.safeParse({
        id: 1,
        username: 'abc',
        email: 'user@example.test',
        roles: ['ROLE_USER'],
      }).success,
    ).toBe(true)
    expect(
      UserResponseSchema.safeParse({
        id: 1,
        username: 'abc',
        email: 'user@example.test',
        roles: ['admin'],
      }).success,
    ).toBe(false)
    expect(
      JwtResponseSchema.safeParse({
        token: 'token',
        type: 'Bearer',
        id: 1,
        username: 'abc',
        email: 'user@example.test',
        roles: ['ROLE_USER'],
      }).success,
    ).toBe(true)
  })
})

describe('mobile auth contracts', () => {
  it('validates mobile signin and rejects unknown fields', () => {
    expect(
      MobileSignInRequestSchema.safeParse({
        username: 'mobileuser',
        password: 'secret1',
        device: { name: 'Pixel 8', platform: 'android' },
      }).success,
    ).toBe(true)
    expect(
      MobileSignInRequestSchema.safeParse({
        username: 'mobileuser',
        password: 'secret1',
        rememberMe: true,
      }).success,
    ).toBe(false)
  })

  it('validates mobile signup using existing signup rules plus bounded device metadata', () => {
    expect(
      MobileSignUpRequestSchema.safeParse({
        username: 'mobileuser',
        email: 'mobile@example.test',
        password: 'secret1',
        device: { platform: 'ios' },
      }).success,
    ).toBe(true)
    expect(
      MobileSignUpRequestSchema.safeParse({
        username: 'mobileuser',
        email: 'mobile@example.test',
        password: 'secret1',
        device: { name: 'x'.repeat(81), platform: 'ios' },
      }).success,
    ).toBe(false)
    expect(
      MobileSignUpRequestSchema.safeParse({
        username: 'bad!',
        email: 'mobile@example.test',
        password: 'secret1',
      }).success,
    ).toBe(false)
  })

  it('validates refresh and logout request bodies', () => {
    const refreshToken = 'a'.repeat(64)
    expect(MobileRefreshRequestSchema.safeParse({ refreshToken }).success).toBe(true)
    expect(MobileLogoutRequestSchema.safeParse({ refreshToken }).success).toBe(true)
    expect(MobileRefreshRequestSchema.safeParse({ refreshToken: 'short' }).success).toBe(false)
    expect(MobileLogoutRequestSchema.safeParse({ refreshToken, extra: true }).success).toBe(false)
  })

  it('validates token-pair responses and UTC timestamps', () => {
    expect(
      MobileTokenPairResponseSchema.safeParse({
        accessToken: 'access',
        refreshToken: 'refresh',
        accessTokenExpiresAt: '2026-01-01T00:15:00Z',
        refreshTokenExpiresAt: '2026-01-31T00:00:00Z',
        user: {
          id: 1,
          username: 'mobileuser',
          email: 'mobile@example.test',
          roles: ['ROLE_USER'],
        },
      }).success,
    ).toBe(true)
    expect(
      MobileTokenPairResponseSchema.safeParse({
        accessToken: 'access',
        refreshToken: 'refresh',
        accessTokenExpiresAt: '2026-01-01T00:15:00',
        refreshTokenExpiresAt: '2026-01-31T00:00:00Z',
        user: {
          id: 1,
          username: 'mobileuser',
          email: 'mobile@example.test',
          roles: ['ROLE_USER'],
        },
      }).success,
    ).toBe(false)
  })

  it('validates safe session responses only', () => {
    expect(
      MobileSessionResponseSchema.safeParse({
        id: '11111111-1111-4111-8111-111111111111',
        deviceName: null,
        devicePlatform: 'android',
        createdAt: '2026-01-01T00:00:00Z',
        lastUsedAt: '2026-01-01T00:05:00Z',
        expiresAt: '2026-01-31T00:00:00Z',
        current: true,
      }).success,
    ).toBe(true)
    expect(
      MobileSessionResponseSchema.safeParse({
        id: '11111111-1111-4111-8111-111111111111',
        deviceName: null,
        devicePlatform: 'android',
        createdAt: '2026-01-01T00:00:00Z',
        lastUsedAt: '2026-01-01T00:05:00Z',
        expiresAt: '2026-01-31T00:00:00Z',
        current: true,
        refreshTokenHash: 'secret',
      }).success,
    ).toBe(false)
  })

  it('validates revoke-all query and response contracts', () => {
    expect(MobileRevokeAllSessionsQuerySchema.parse({})).toEqual({ keepCurrent: false })
    expect(MobileRevokeAllSessionsQuerySchema.parse({ keepCurrent: 'true' })).toEqual({
      keepCurrent: true,
    })
    expect(
      MobileRevokeAllSessionsQuerySchema.safeParse({ keepCurrent: false, extra: true }).success,
    ).toBe(false)
    expect(MobileRevokeAllSessionsResponseSchema.safeParse({ revoked: 2 }).success).toBe(true)
    expect(MobileRevokeAllSessionsResponseSchema.safeParse({ revoked: -1 }).success).toBe(false)
  })
})
