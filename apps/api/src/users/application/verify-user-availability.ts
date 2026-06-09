import type { UserRepository } from '../domain/user.repository.js';

export interface UserAvailability {
  usernameAvailable: boolean;
  emailAvailable: boolean;
}

export async function verifyUserAvailability(
  input: { username: string; email: string },
  users: UserRepository,
): Promise<UserAvailability> {
  const [usernameExists, emailExists] = await Promise.all([
    users.existsByUsername(input.username),
    users.existsByEmail(input.email),
  ]);
  return {
    usernameAvailable: !usernameExists,
    emailAvailable: !emailExists,
  };
}
