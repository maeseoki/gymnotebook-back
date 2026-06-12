import { pathToFileURL } from 'node:url'
import { cleanupMobileSessions } from '../src/mobile-auth/application/cleanup-mobile-sessions.js'
import { SystemClock } from '../src/mobile-auth/domain/mobile-session-time.js'
import { DrizzleMobileSessionUnitOfWork } from '../src/mobile-auth/infrastructure/drizzle-mobile-session.repository.js'
import { createDatabaseClient } from '../src/shared/db.js'
import { parseEnv } from '../src/shared/env.js'

const DEFAULT_BATCH_LIMIT = 500

export async function runMobileSessionCleanup(limit = DEFAULT_BATCH_LIMIT): Promise<number> {
  const env = parseEnv(process.env)
  const client = createDatabaseClient(env)
  try {
    return await cleanupMobileSessions(
      { limit },
      {
        unitOfWork: new DrizzleMobileSessionUnitOfWork(client.db),
        clock: new SystemClock(),
        retentionMs: env.MOBILE_SESSION_CLEANUP_RETENTION_MS,
      },
    )
  } finally {
    await client.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const deleted = await runMobileSessionCleanup()
  console.log(`Deleted ${deleted} mobile session rows`)
}
