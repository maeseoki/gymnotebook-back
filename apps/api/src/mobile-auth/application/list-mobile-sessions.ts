import type { MobileSessionResponse } from '@gymnotebook/contracts'
import type { MobileSessionUnitOfWork } from '../domain/mobile-session.repository.js'
import type { Clock } from '../domain/mobile-session-time.js'
import { mysqlUtcToIso, toMysqlUtc } from '../domain/mobile-session-time.js'

export interface ListMobileSessionsDeps {
  unitOfWork: MobileSessionUnitOfWork
  clock: Clock
}

export async function listMobileSessionsForUser(
  input: { userId: number; currentSessionId?: string },
  deps: ListMobileSessionsDeps,
): Promise<MobileSessionResponse[]> {
  const now = toMysqlUtc(deps.clock.now())
  const sessions = await deps.unitOfWork.transaction(({ mobileSessions }) =>
    mobileSessions.listActiveByUser({ ...input, now }),
  )

  return sessions.map((session) => ({
    id: session.id,
    deviceName: session.deviceName,
    devicePlatform: session.devicePlatform,
    createdAt: mysqlUtcToIso(session.createdAt),
    lastUsedAt: mysqlUtcToIso(session.lastUsedAt),
    expiresAt: mysqlUtcToIso(session.expiresAt),
    current: session.current,
  }))
}
