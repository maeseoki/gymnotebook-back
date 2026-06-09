import type { SignupRequest } from '@gymnotebook/contracts';
import type { RoleRepository } from '../../users/domain/role.repository.js';
import type { UserRepository } from '../../users/domain/user.repository.js';
import {
  DefaultRoleNotFoundError,
  EmailAlreadyExistsError,
  UsernameAlreadyExistsError,
} from '../domain/auth.errors.js';
import type { PasswordHasher } from '../domain/password-hasher.js';

export interface SignUpTransactionRepositories {
  users: UserRepository;
  roles: RoleRepository;
}

export interface SignUpDeps {
  passwordHasher: PasswordHasher;
  transaction: <T>(work: (repositories: SignUpTransactionRepositories) => Promise<T>) => Promise<T>;
  isDuplicateUsernameError: (error: unknown) => boolean;
  isDuplicateEmailError: (error: unknown) => boolean;
}

export async function signUp(
  request: SignupRequest,
  deps: SignUpDeps,
): Promise<{ userId: number; username: string }> {
  const passwordHash = await deps.passwordHasher.hash(request.password);

  try {
    return await deps.transaction(async ({ users, roles }) => {
      if (await users.existsByUsername(request.username)) {
        throw new UsernameAlreadyExistsError();
      }

      if (await users.existsByEmail(request.email)) {
        throw new EmailAlreadyExistsError();
      }

      const userRole = await roles.findByName('ROLE_USER');
      if (!userRole) {
        throw new DefaultRoleNotFoundError();
      }

      const userId = await users.createUser({
        username: request.username,
        email: request.email,
        passwordHash,
      });
      await users.assignRole(userId, userRole.id);

      return { userId, username: request.username };
    });
  } catch (error) {
    if (deps.isDuplicateUsernameError(error)) {
      throw new UsernameAlreadyExistsError();
    }
    if (deps.isDuplicateEmailError(error)) {
      throw new EmailAlreadyExistsError();
    }
    throw error;
  }
}
