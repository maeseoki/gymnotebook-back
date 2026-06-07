import type { ERole, JwtResponse, LoginRequest } from '@gymnotebook/contracts';
import * as argon2 from 'argon2';
import type { UserRepository } from '../../users/domain/user.repository.js';
import { InvalidCredentialsError } from '../domain/auth.errors.js';

export interface SignInDeps {
  userRepository: UserRepository;
  generateToken: (payload: { sub: string; userId: number; roles: ERole[] }) => string;
}

export async function signIn(request: LoginRequest, deps: SignInDeps): Promise<JwtResponse> {
  const user = await deps.userRepository.findByUsername(request.username);
  if (!user) {
    throw new InvalidCredentialsError();
  }

  const isValid = await argon2.verify(user.password, request.password);
  if (!isValid) {
    throw new InvalidCredentialsError();
  }

  const roles = user.roles.map((r) => r.name as ERole);
  const token = deps.generateToken({ sub: user.username, userId: user.id, roles });

  return {
    token,
    type: 'Bearer',
    id: user.id,
    username: user.username,
    email: user.email,
    roles,
  };
}
