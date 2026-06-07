import type { ERole, Role } from './role.js';

export interface RoleRepository {
  findByName(name: ERole): Promise<Role | null>;
  findById(id: number): Promise<Role | null>;
}
