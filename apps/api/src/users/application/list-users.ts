import { type PublicUser, toPublicUser } from '../domain/user.js';
import type { UserRepository } from '../domain/user.repository.js';

export async function listUsers(users: UserRepository): Promise<PublicUser[]> {
  return (await users.findAll()).map(toPublicUser);
}
