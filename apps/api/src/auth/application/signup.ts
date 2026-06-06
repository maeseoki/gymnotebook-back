import * as argon2 from 'argon2';
import type { SignupRequest } from '@gymnotebook/contracts';
import type { UserRepository } from '../../users/domain/user.repository.js';
import type { RoleRepository } from '../../users/domain/role.repository.js';
import { DuplicateUsernameError, DuplicateEmailError } from '../domain/auth.errors.js';

export interface SignUpDeps {
  userRepository: UserRepository;
  roleRepository: RoleRepository;
}

export async function signUp(
  request: SignupRequest,
  deps: SignUpDeps,
): Promise<{ username: string }> {
  const existsByUsername = await deps.userRepository.existsByUsername(request.username);
  if (existsByUsername) {
    throw new DuplicateUsernameError();
  }

  const existsByEmail = await deps.userRepository.existsByEmail(request.email);
  if (existsByEmail) {
    throw new DuplicateEmailError();
  }

  const hashedPassword = await argon2.hash(request.password, {
    type: argon2.argon2id,
  });

  const userRole = await deps.roleRepository.findByName('ROLE_USER');
  if (!userRole) {
    throw new Error('Role ROLE_USER not found. Please seed the database.');
  }

  await deps.userRepository.create({
    username: request.username,
    email: request.email,
    password: hashedPassword,
    roleIds: [userRole.id],
  });

  return { username: request.username };
}
