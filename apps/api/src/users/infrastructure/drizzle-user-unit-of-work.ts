import type { Database } from '../../shared/db.js'
import { inTransaction } from '../../shared/transaction.js'
import type { AssignRoleTransactionRepositories } from '../application/assign-role.js'
import type { DeleteUserTransactionRepositories } from '../application/delete-user.js'
import type { RemoveRoleTransactionRepositories } from '../application/remove-role.js'
import { DrizzleRoleRepository } from './drizzle-role.repository.js'
import { DrizzleUserRepository } from './drizzle-user.repository.js'

export class DrizzleUserUnitOfWork {
  constructor(private readonly db: Database) {}

  async withUsersAndRoles<T>(
    work: (
      repositories: AssignRoleTransactionRepositories | RemoveRoleTransactionRepositories,
    ) => Promise<T>,
  ): Promise<T> {
    return inTransaction(this.db, (tx) =>
      work({
        users: new DrizzleUserRepository(tx),
        roles: new DrizzleRoleRepository(tx),
      }),
    )
  }

  async withUsers<T>(
    work: (repositories: DeleteUserTransactionRepositories) => Promise<T>,
  ): Promise<T> {
    return inTransaction(this.db, (tx) =>
      work({
        users: new DrizzleUserRepository(tx),
      }),
    )
  }
}
