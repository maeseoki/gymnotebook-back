import {
  CannotDeleteLastAdminError,
  CannotDeleteSelfError,
  UserNotFoundError,
} from '../domain/user.errors.js';
import type { UserRepository } from '../domain/user.repository.js';

export interface DeleteUserTransactionRepositories {
  users: UserRepository;
}

export interface DeleteUserDeps {
  transaction: <T>(
    work: (repositories: DeleteUserTransactionRepositories) => Promise<T>,
  ) => Promise<T>;
}

export async function deleteUser(
  input: { actorUserId: number; targetUserId: number },
  deps: DeleteUserDeps,
): Promise<void> {
  await deps.transaction(async ({ users }) => {
    if (input.actorUserId === input.targetUserId) {
      throw new CannotDeleteSelfError();
    }

    if (!(await users.existsById(input.targetUserId))) {
      throw new UserNotFoundError();
    }

    if (
      (await users.hasRole(input.targetUserId, 'ROLE_ADMIN')) &&
      (await users.countUsersByRoleForUpdate('ROLE_ADMIN')) <= 1
    ) {
      throw new CannotDeleteLastAdminError();
    }

    await users.deleteById(input.targetUserId);
  });
}
