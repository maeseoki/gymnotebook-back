import type { ERole } from './role.js';
import type { AuthenticatedUserCredentials, UserWithRoles } from './user.js';

export interface CreateUserInput {
  username: string;
  email: string;
  passwordHash: string;
}

export interface UserRepository {
  findCredentialsByUsername(username: string): Promise<AuthenticatedUserCredentials | null>;
  findById(id: number): Promise<UserWithRoles | null>;
  findAll(): Promise<UserWithRoles[]>;
  existsByUsername(username: string): Promise<boolean>;
  existsByEmail(email: string): Promise<boolean>;
  existsById(id: number): Promise<boolean>;
  createUser(input: CreateUserInput): Promise<number>;
  updatePasswordHash(userId: number, passwordHash: string): Promise<void>;
  assignRole(userId: number, roleId: number): Promise<void>;
  removeRole(userId: number, roleId: number): Promise<void>;
  hasRole(userId: number, role: ERole): Promise<boolean>;
  countUsersByRole(role: ERole): Promise<number>;
  deleteById(id: number): Promise<void>;
}
