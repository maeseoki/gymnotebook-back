import { UserNotFoundError } from '../domain/user.errors.js'
import { type PublicUser, toPublicUser } from '../domain/user.js'
import type { UserRepository } from '../domain/user.repository.js'

export async function getCurrentUser(userId: number, users: UserRepository): Promise<PublicUser> {
  const user = await users.findById(userId)
  if (!user) {
    throw new UserNotFoundError()
  }
  return toPublicUser(user)
}
