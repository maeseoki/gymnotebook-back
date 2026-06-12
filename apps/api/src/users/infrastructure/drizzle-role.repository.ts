import { eq } from 'drizzle-orm'
import * as schema from '../../../drizzle/schema.js'
import type { DbExecutor } from '../../shared/transaction.js'
import type { ERole, Role } from '../domain/role.js'
import type { RoleRepository } from '../domain/role.repository.js'

export class DrizzleRoleRepository implements RoleRepository {
  constructor(private readonly db: DbExecutor) {}

  async findByName(name: ERole): Promise<Role | null> {
    const rows = await this.db
      .select()
      .from(schema.roles)
      .where(eq(schema.roles.name, name))
      .limit(1)
    return rows[0] ?? null
  }

  async findById(id: number): Promise<Role | null> {
    const rows = await this.db.select().from(schema.roles).where(eq(schema.roles.id, id)).limit(1)
    return rows[0] ?? null
  }
}
