import {
  InvalidMobileSessionError,
  MobileSessionNotFoundError,
} from '../domain/mobile-session.errors.js';
import type { MobileSessionUnitOfWork } from '../domain/mobile-session.repository.js';
import type { Clock } from '../domain/mobile-session-time.js';
import { toMysqlUtc } from '../domain/mobile-session-time.js';
import type { RefreshTokenService } from '../domain/refresh-token-service.js';

export interface RevokeMobileSessionByTokenDeps {
  unitOfWork: MobileSessionUnitOfWork;
  refreshTokens: RefreshTokenService;
  clock: Clock;
}

export async function revokeMobileSessionByRefreshToken(
  input: { refreshToken: string },
  deps: RevokeMobileSessionByTokenDeps,
): Promise<void> {
  const hash = deps.refreshTokens.hash(input.refreshToken);
  const now = toMysqlUtc(deps.clock.now());
  await deps.unitOfWork.transaction(async ({ mobileSessions }) => {
    await mobileSessions.revokeByRefreshTokenHash(hash, now);
  });
}

export interface RevokeMobileSessionByIdDeps {
  unitOfWork: MobileSessionUnitOfWork;
  clock: Clock;
}

export async function revokeMobileSessionByIdForUser(
  input: { userId: number; sessionId: string },
  deps: RevokeMobileSessionByIdDeps,
): Promise<void> {
  const now = toMysqlUtc(deps.clock.now());
  const revoked = await deps.unitOfWork.transaction(({ mobileSessions }) =>
    mobileSessions.revokeBySessionIdForUser({ ...input, now }),
  );
  if (revoked === 0) {
    throw new MobileSessionNotFoundError();
  }
}

export function mapRevocationError(error: unknown): InvalidMobileSessionError {
  if (error instanceof MobileSessionNotFoundError) {
    return new InvalidMobileSessionError();
  }
  throw error;
}
