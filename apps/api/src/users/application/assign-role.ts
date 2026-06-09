import type { ERole } from '../domain/role.js';
import { isElevatedRole } from '../domain/role.js';
import type { RoleRepository } from '../domain/role.repository.js';
import {
  InvalidRoleChangeError,
  RoleAlreadyAssignedError,
  RoleNotFoundError,
  UserNotFoundError,
} from '../domain/user.errors.js';
import type { UserRepository } from '../domain/user.repository.js';

export interface AssignRoleTransactionRepositories {
  users: UserRepository;
  roles: RoleRepository;
}

export interface AssignRoleDeps {
  transaction: <T>(
    work: (repositories: AssignRoleTransactionRepositories) => Promise<T>,
  ) => Promise<T>;
  isDuplicateUserRoleError: (error: unknown) => boolean;
}

export async function assignRole(
  input: { userId: number; role: ERole },
  deps: AssignRoleDeps,
): Promise<void> {
  try {
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

      if (await users.hasRole(input.userId, input.role)) {
        throw new RoleAlreadyAssignedError();
      }

      await users.assignRole(input.userId, role.id);
    });
  } catch (error) {
    if (deps.isDuplicateUserRoleError(error)) {
      throw new RoleAlreadyAssignedError();
    }
    throw error;
  }
}
