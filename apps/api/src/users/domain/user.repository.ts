export interface UserRole {
  id: number;
  name: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  roles: UserRole[];
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  roleIds: number[];
}

export interface UserRepository {
  findByUsername(username: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  findAll(): Promise<User[]>;
  existsByUsername(username: string): Promise<boolean>;
  existsByEmail(email: string): Promise<boolean>;
  existsById(id: number): Promise<boolean>;
  create(input: CreateUserInput): Promise<User>;
  updateRoles(userId: number, roleIds: number[]): Promise<void>;
  deleteById(id: number): Promise<void>;
}
