import type { Database } from '../../shared/db.js'
import { inTransaction } from '../../shared/transaction.js'
import { DrizzleRoleRepository } from '../../users/infrastructure/drizzle-role.repository.js'
import { DrizzleUserRepository } from '../../users/infrastructure/drizzle-user.repository.js'
import type { MobileSignUpTransactionRepositories } from '../application/sign-up-mobile.js'
import { DrizzleMobileSessionRepository } from './drizzle-mobile-session.repository.js'

export class DrizzleMobileSignUpUnitOfWork {
  constructor(private readonly db: Database) {}

  transaction<T>(
    work: (repositories: MobileSignUpTransactionRepositories) => Promise<T>,
  ): Promise<T> {
    return inTransaction(this.db, (tx) =>
      work({
        users: new DrizzleUserRepository(tx),
        roles: new DrizzleRoleRepository(tx),
        mobileSessions: new DrizzleMobileSessionRepository(tx),
      }),
    )
  }
}
