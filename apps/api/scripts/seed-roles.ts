import { pathToFileURL } from 'node:url'
import { sql } from 'drizzle-orm'
import { roleNames, roles } from '../drizzle/schema.js'
import { createDatabaseClient, type Database } from '../src/shared/db.js'
import { parseEnv } from '../src/shared/env.js'

export async function seedRoles(db: Database): Promise<void> {
  await db
    .insert(roles)
    .values(roleNames.map((name) => ({ name })))
    .onDuplicateKeyUpdate({
      set: {
        name: sql`${roles.name}`,
      },
    })
}

async function main() {
  const client = createDatabaseClient(parseEnv(process.env))
  try {
    await seedRoles(client.db)
  } finally {
    await client.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
