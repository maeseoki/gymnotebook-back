import type { MeResponse, UserResponse } from '@gymnotebook/contracts';
import type { PublicUser } from '../domain/user.js';

export function toUserResponse(user: PublicUser): UserResponse {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    roles: user.roles,
  };
}

export function toMeResponse(user: PublicUser): MeResponse {
  return toUserResponse(user);
}
