import type { ERole, JwtResponse, LoginRequest } from '@gymnotebook/contracts';
import type { UserRepository } from '../../users/domain/user.repository.js';
import { InvalidCredentialsError } from '../domain/auth.errors.js';
import type { LegacyPasswordHasher, PasswordHasher } from '../domain/password-hasher.js';

export interface TokenIssuer {
  issue(payload: { sub: string; userId: number; roles: ERole[] }): string;
}

export interface SignInDeps {
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
  legacyPasswordHasher: LegacyPasswordHasher;
  tokenIssuer: TokenIssuer;
}

export async function signIn(request: LoginRequest, deps: SignInDeps): Promise<JwtResponse> {
  const user = await deps.userRepository.findCredentialsByUsername(request.username);
  if (!user) {
    throw new InvalidCredentialsError();
  }

  const verifiedByArgon2 = await deps.passwordHasher.verify(user.passwordHash, request.password);
  let verifiedByLegacy = false;
  if (!verifiedByArgon2 && deps.legacyPasswordHasher.isHash(user.passwordHash)) {
    verifiedByLegacy = await deps.legacyPasswordHasher.verify(user.passwordHash, request.password);
  }

  if (!verifiedByArgon2 && !verifiedByLegacy) {
    throw new InvalidCredentialsError();
  }

  if (verifiedByLegacy) {
    const migratedHash = await deps.passwordHasher.hash(request.password);
    await deps.userRepository.updatePasswordHash(user.id, migratedHash);
  }

  const token = deps.tokenIssuer.issue({
    sub: user.username,
    userId: user.id,
    roles: user.roles,
  });

  return {
    token,
    type: 'Bearer',
    id: user.id,
    username: user.username,
    email: user.email,
    roles: user.roles,
  };
}
