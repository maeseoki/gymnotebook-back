import { eq } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../../drizzle/schema.js';
import type { Role, RoleRepository } from '../domain/role.repository.js';

type DB = MySql2Database<typeof schema>;

export class DrizzleRoleRepository implements RoleRepository {
  constructor(private readonly db: DB) {}

  async findByName(name: string): Promise<Role | null> {
    const rows = await this.db
      .select()
      .from(schema.roles)
      .where(eq(schema.roles.name, name as 'ROLE_USER' | 'ROLE_MODERATOR' | 'ROLE_ADMIN'))
      .limit(1);
    return rows[0] ?? null;
  }

  async findById(id: number): Promise<Role | null> {
    const rows = await this.db.select().from(schema.roles).where(eq(schema.roles.id, id)).limit(1);
    return rows[0] ?? null;
  }
}
