import type { MobileSessionUnitOfWork } from '../domain/mobile-session.repository.js';
import type { Clock } from '../domain/mobile-session-time.js';
import { toMysqlUtc } from '../domain/mobile-session-time.js';

export interface CleanupMobileSessionsDeps {
  unitOfWork: MobileSessionUnitOfWork;
  clock: Clock;
  retentionMs: number;
}

export async function cleanupMobileSessions(
  input: { limit: number },
  deps: CleanupMobileSessionsDeps,
): Promise<number> {
  const now = deps.clock.now();
  const cutoff = toMysqlUtc(new Date(now.getTime() - deps.retentionMs));

  return deps.unitOfWork.transaction(({ mobileSessions }) =>
    mobileSessions.cleanup({
      expiredBefore: cutoff,
      revokedBefore: cutoff,
      limit: input.limit,
    }),
  );
}
