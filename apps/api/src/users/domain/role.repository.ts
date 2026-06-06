export interface Role {
  id: number;
  name: string;
}

export interface RoleRepository {
  findByName(name: string): Promise<Role | null>;
  findById(id: number): Promise<Role | null>;
}
