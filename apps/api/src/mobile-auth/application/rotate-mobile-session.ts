import type { MobileTokenPairResponse } from '@gymnotebook/contracts';
import type { MobileAccessTokenIssuer } from '../domain/mobile-access-token-issuer.js';
import {
  ImmediateMobileRefreshTokenReplayError,
  InvalidMobileSessionError,
  MobileRefreshTokenReuseError,
  MobileSessionExpiredError,
  MobileSessionRevokedError,
} from '../domain/mobile-session.errors.js';
import type { MobileSessionUnitOfWork } from '../domain/mobile-session.repository.js';
import type { Clock } from '../domain/mobile-session-time.js';
import {
  addMilliseconds,
  isMysqlUtcExpired,
  millisecondsBetweenMysqlUtc,
  toMysqlUtc,
} from '../domain/mobile-session-time.js';
import type { RefreshTokenService } from '../domain/refresh-token-service.js';
import type {
  MobileSecurityEvent,
  SecurityEventRecorder,
} from '../domain/security-event-recorder.js';
import { issueMobileAccessToken, toMobileTokenPairResponse } from './mobile-auth-result.js';

export interface RotateMobileSessionDeps {
  unitOfWork: MobileSessionUnitOfWork;
  refreshTokens: RefreshTokenService;
  accessTokens: MobileAccessTokenIssuer;
  securityEvents: SecurityEventRecorder;
  clock: Clock;
  refreshTokenTtlMs: number;
  refreshTokenReuseGraceMs: number;
  isRefreshTokenHashConflict: (error: unknown) => boolean;
}

type RotateTransactionResult =
  | {
      status: 'rotated';
      response: MobileTokenPairResponse;
    }
  | {
      status: 'immediate_replay';
      event: MobileSecurityEvent;
    }
  | {
      status: 'reuse_detected';
      event: MobileSecurityEvent;
    };

export async function rotateMobileSession(
  input: { refreshToken: string },
  deps: RotateMobileSessionDeps,
): Promise<MobileTokenPairResponse> {
  const presentedHash = deps.refreshTokens.hash(input.refreshToken);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const newRawRefreshToken = deps.refreshTokens.generate();
    const newRefreshTokenHash = deps.refreshTokens.hash(newRawRefreshToken);
    const nowDate = deps.clock.now();
    const now = toMysqlUtc(nowDate);
    const expiresAt = toMysqlUtc(addMilliseconds(nowDate, deps.refreshTokenTtlMs));

    try {
      const result: RotateTransactionResult = await deps.unitOfWork.transaction(
        async ({ mobileSessions }) => {
          const existing = await mobileSessions.findByRefreshTokenHashForUpdate(presentedHash);
          if (!existing) {
            throw new InvalidMobileSessionError();
          }

          if (existing.replacedBySessionRowId !== null) {
            const event: MobileSecurityEvent = {
              type: isWithinReplayGrace(existing.rotatedAt, now, deps.refreshTokenReuseGraceMs)
                ? 'mobile_refresh_token_immediate_replay'
                : 'mobile_refresh_token_reuse',
              userId: existing.userId,
              sessionId: existing.sessionId,
              tokenFamilyId: existing.tokenFamilyId,
              occurredAt: now,
            };

            if (event.type === 'mobile_refresh_token_immediate_replay') {
              return { status: 'immediate_replay', event };
            }

            await mobileSessions.revokeTokenFamily(existing.tokenFamilyId, now);
            return { status: 'reuse_detected', event };
          }

          if (existing.revokedAt !== null) {
            throw new MobileSessionRevokedError();
          }

          if (isMysqlUtcExpired(existing.expiresAt, now)) {
            throw new MobileSessionExpiredError();
          }

          const user = await mobileSessions.findUserForSession(existing.userId);
          if (!user) {
            throw new InvalidMobileSessionError();
          }

          const accessToken = issueMobileAccessToken({
            issuer: deps.accessTokens,
            tokenRow: existing,
            user,
          });

          const tokenRow = await mobileSessions.rotate({
            previousRow: existing,
            refreshTokenHash: newRefreshTokenHash,
            now,
            expiresAt,
          });

          return {
            status: 'rotated',
            response: toMobileTokenPairResponse({
              accessToken,
              tokenRow,
              user,
              rawRefreshToken: newRawRefreshToken,
            }),
          };
        },
      );

      if (result.status === 'immediate_replay') {
        await recordSecurityEventBestEffort(deps.securityEvents, result.event);
        throw new ImmediateMobileRefreshTokenReplayError();
      }

      if (result.status === 'reuse_detected') {
        await recordSecurityEventBestEffort(deps.securityEvents, result.event);
        throw new MobileRefreshTokenReuseError();
      }

      return result.response;
    } catch (error) {
      if (attempt < 3 && deps.isRefreshTokenHashConflict(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to rotate unique mobile refresh token');
}

function isWithinReplayGrace(rotatedAt: string | null, now: string, graceMs: number): boolean {
  if (rotatedAt === null) {
    return false;
  }
  return millisecondsBetweenMysqlUtc(rotatedAt, now) <= graceMs;
}

async function recordSecurityEventBestEffort(
  recorder: SecurityEventRecorder,
  event: MobileSecurityEvent,
): Promise<void> {
  try {
    await recorder.record(event);
  } catch {
    return;
  }
}
