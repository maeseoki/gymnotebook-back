import type { ERole } from '../domain/role.js';
import { isElevatedRole } from '../domain/role.js';
import type { RoleRepository } from '../domain/role.repository.js';
import {
  CannotDeleteLastAdminError,
  InvalidRoleChangeError,
  RoleNotAssignedError,
  RoleNotFoundError,
  UserNotFoundError,
} from '../domain/user.errors.js';
import type { UserRepository } from '../domain/user.repository.js';

export interface RemoveRoleTransactionRepositories {
  users: UserRepository;
  roles: RoleRepository;
}

export interface RemoveRoleDeps {
  transaction: <T>(
    work: (repositories: RemoveRoleTransactionRepositories) => Promise<T>,
  ) => Promise<T>;
}

export async function removeRole(
  input: { userId: number; role: ERole },
  deps: RemoveRoleDeps,
): Promise<void> {
  await deps.transaction(async ({ users, roles }) => {
    if (!isElevatedRole(input.role)) {
      throw new InvalidRoleChangeError();
    }

    if (!(await users.existsById(input.userId))) {
      throw new UserNotFoundError();
    }

    const role = await roles.findByName(input.role);
    if (!role) {
      throw new RoleNotFoundError();
    }

    if (!(await users.hasRole(input.userId, input.role))) {
      throw new RoleNotAssignedError();
    }

    if (input.role === 'ROLE_ADMIN' && (await users.countUsersByRole('ROLE_ADMIN')) <= 1) {
      throw new CannotDeleteLastAdminError();
    }

    await users.removeRole(input.userId, role.id);
  });
}
