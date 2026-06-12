import type { Database } from '../../shared/db.js'
import { inTransaction } from '../../shared/transaction.js'
import { DrizzleRoleRepository } from '../../users/infrastructure/drizzle-role.repository.js'
import { DrizzleUserRepository } from '../../users/infrastructure/drizzle-user.repository.js'
import type { SignUpTransactionRepositories } from '../application/sign-up.js'

export class DrizzleSignUpUnitOfWork {
  constructor(private readonly db: Database) {}

  async transaction<T>(
    work: (repositories: SignUpTransactionRepositories) => Promise<T>,
  ): Promise<T> {
    return inTransaction(this.db, (tx) =>
      work({
        users: new DrizzleUserRepository(tx),
        roles: new DrizzleRoleRepository(tx),
      }),
    )
  }
}
