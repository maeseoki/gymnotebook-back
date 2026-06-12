import type { Database } from './db.js'

export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
export type DbExecutor = Database | Transaction

export async function inTransaction<T>(
  db: Database,
  work: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(work)
}
