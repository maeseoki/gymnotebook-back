import type { FastifyInstance } from 'fastify'
import { validateCredentials } from '../../auth/application/sign-in.js'
import { Argon2PasswordHasher } from '../../auth/infrastructure/argon2-password-hasher.js'
import { BcryptPasswordHasher } from '../../auth/infrastructure/bcrypt-password-hasher.js'
import { isUniqueConstraintError } from '../../shared/persistence-errors.js'
import { DrizzleUserRepository } from '../../users/infrastructure/drizzle-user.repository.js'
import { createMobileSession } from '../application/create-mobile-session.js'
import { listMobileSessionsForUser } from '../application/list-mobile-sessions.js'
import { revokeAllMobileSessionsForUser } from '../application/revoke-all-mobile-sessions.js'
import {
  revokeMobileSessionByIdForUser,
  revokeMobileSessionByRefreshToken,
} from '../application/revoke-mobile-session.js'
import { rotateMobileSession } from '../application/rotate-mobile-session.js'
import { signUpMobile } from '../application/sign-up-mobile.js'
import { validateActiveMobileSessionForUser } from '../application/validate-active-mobile-session.js'
import { CryptoRefreshTokenService } from '../infrastructure/crypto-refresh-token.service.js'
import { DrizzleMobileSessionUnitOfWork } from '../infrastructure/drizzle-mobile-session.repository.js'
import { DrizzleMobileSignUpUnitOfWork } from '../infrastructure/drizzle-mobile-sign-up-unit-of-work.js'
import { JwtMobileAccessTokenIssuer } from '../infrastructure/jwt-mobile-access-token.issuer.js'

export function createMobileAuthDependencies(fastify: FastifyInstance) {
  const passwordHasher = new Argon2PasswordHasher()
  const legacyPasswordHasher = new BcryptPasswordHasher()
  const userRepository = new DrizzleUserRepository(fastify.db)
  const mobileSessionUnitOfWork = new DrizzleMobileSessionUnitOfWork(fastify.db)
  const mobileSignUpUnitOfWork = new DrizzleMobileSignUpUnitOfWork(fastify.db)
  const refreshTokens = new CryptoRefreshTokenService(
    fastify.config.MOBILE_REFRESH_TOKEN_PEPPER,
    fastify.config.MOBILE_REFRESH_TOKEN_BYTES,
  )
  const accessTokens = new JwtMobileAccessTokenIssuer(
    (payload, options) => fastify.jwt.sign(payload, options),
    fastify.config.MOBILE_ACCESS_TOKEN_TTL,
  )
  const clock = { now: () => new Date() }
  const isRefreshTokenHashConflict = (error: unknown) =>
    isUniqueConstraintError(error, ['mobile_sessions_refresh_token_hash_unique'])
  const isDuplicateUsernameError = (error: unknown) =>
    isUniqueConstraintError(error, ['users_username_unique', 'username'])
  const isDuplicateEmailError = (error: unknown) =>
    isUniqueConstraintError(error, ['users_email_unique', 'email'])

  return {
    validateCredentials: (input: Parameters<typeof validateCredentials>[0]) =>
      validateCredentials(input, {
        userRepository,
        passwordHasher,
        legacyPasswordHasher,
      }),
    createMobileSession: (input: Parameters<typeof createMobileSession>[0]) =>
      createMobileSession(input, {
        unitOfWork: mobileSessionUnitOfWork,
        refreshTokens,
        accessTokens,
        clock,
        refreshTokenTtlMs: fastify.config.MOBILE_REFRESH_TOKEN_TTL,
        isRefreshTokenHashConflict,
      }),
    signUpMobile: (input: Parameters<typeof signUpMobile>[0]) =>
      signUpMobile(input, {
        passwordHasher,
        transaction: (work) => mobileSignUpUnitOfWork.transaction(work),
        refreshTokens,
        accessTokens,
        clock,
        refreshTokenTtlMs: fastify.config.MOBILE_REFRESH_TOKEN_TTL,
        isDuplicateUsernameError,
        isDuplicateEmailError,
        isRefreshTokenHashConflict,
      }),
    rotateMobileSession: (input: Parameters<typeof rotateMobileSession>[0]) =>
      rotateMobileSession(input, {
        unitOfWork: mobileSessionUnitOfWork,
        refreshTokens,
        accessTokens,
        securityEvents: {
          record: async (event) => {
            fastify.log.warn({ mobileSecurityEvent: event }, event.type)
          },
        },
        clock,
        refreshTokenTtlMs: fastify.config.MOBILE_REFRESH_TOKEN_TTL,
        refreshTokenReuseGraceMs: fastify.config.MOBILE_REFRESH_TOKEN_REUSE_GRACE_MS,
        isRefreshTokenHashConflict,
      }),
    revokeMobileSessionByRefreshToken: (
      input: Parameters<typeof revokeMobileSessionByRefreshToken>[0],
    ) =>
      revokeMobileSessionByRefreshToken(input, {
        unitOfWork: mobileSessionUnitOfWork,
        refreshTokens,
        clock,
      }),
    listMobileSessionsForUser: (input: Parameters<typeof listMobileSessionsForUser>[0]) =>
      listMobileSessionsForUser(input, {
        unitOfWork: mobileSessionUnitOfWork,
        clock,
      }),
    validateActiveMobileSessionForUser: (
      input: Parameters<typeof validateActiveMobileSessionForUser>[0],
    ) =>
      validateActiveMobileSessionForUser(input, {
        unitOfWork: mobileSessionUnitOfWork,
        clock,
      }),
    revokeMobileSessionByIdForUser: (input: Parameters<typeof revokeMobileSessionByIdForUser>[0]) =>
      revokeMobileSessionByIdForUser(input, {
        unitOfWork: mobileSessionUnitOfWork,
        clock,
      }),
    revokeAllMobileSessionsForUser: (input: Parameters<typeof revokeAllMobileSessionsForUser>[0]) =>
      revokeAllMobileSessionsForUser(input, {
        unitOfWork: mobileSessionUnitOfWork,
        clock,
      }),
  }
}

export type MobileAuthDependencies = ReturnType<typeof createMobileAuthDependencies>
