import type { ERole, Role } from './role.js';

export interface UserRole extends Role {}

export interface PublicUser {
  id: number;
  username: string;
  email: string;
  roles: ERole[];
}

export interface UserWithRoles {
  id: number;
  username: string;
  email: string;
  roles: UserRole[];
}

export interface AuthenticatedUserCredentials {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  roles: ERole[];
}

export function toPublicUser(user: UserWithRoles): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    roles: user.roles.map((role) => role.name),
  };
}
