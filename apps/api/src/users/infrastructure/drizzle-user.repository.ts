import { eq } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../../drizzle/schema.js';
import type { CreateUserInput, User, UserRepository } from '../domain/user.repository.js';

type DB = MySql2Database<typeof schema>;

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: DB) {}

  async findByUsername(username: string): Promise<User | null> {
    const rows = await this.db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        password: schema.users.password,
        roleId: schema.roles.id,
        roleName: schema.roles.name,
      })
      .from(schema.users)
      .leftJoin(schema.userRoles, eq(schema.userRoles.userId, schema.users.id))
      .leftJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
      .where(eq(schema.users.username, username));

    return this.mapRows(rows);
  }

  async findById(id: number): Promise<User | null> {
    const rows = await this.db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        password: schema.users.password,
        roleId: schema.roles.id,
        roleName: schema.roles.name,
      })
      .from(schema.users)
      .leftJoin(schema.userRoles, eq(schema.userRoles.userId, schema.users.id))
      .leftJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
      .where(eq(schema.users.id, id));

    return this.mapRows(rows);
  }

  async findAll(): Promise<User[]> {
    const rows = await this.db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        password: schema.users.password,
        roleId: schema.roles.id,
        roleName: schema.roles.name,
      })
      .from(schema.users)
      .leftJoin(schema.userRoles, eq(schema.userRoles.userId, schema.users.id))
      .leftJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId));

    return this.mapAllRows(rows);
  }

  async existsByUsername(username: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.username, username))
      .limit(1);
    return rows.length > 0;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    return rows.length > 0;
  }

  async existsById(id: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return rows.length > 0;
  }

  async create(input: CreateUserInput): Promise<User> {
    const result = await this.db.insert(schema.users).values({
      username: input.username,
      email: input.email,
      password: input.password,
    });

    const insertId = (result as unknown as { insertId: number }).insertId;
    const userId = insertId;

    if (input.roleIds.length > 0) {
      await this.db
        .insert(schema.userRoles)
        .values(input.roleIds.map((roleId) => ({ userId, roleId })));
    }

    const user = await this.findById(userId);
    if (!user) throw new Error('Failed to create user');
    return user;
  }

  async updateRoles(userId: number, roleIds: number[]): Promise<void> {
    await this.db.delete(schema.userRoles).where(eq(schema.userRoles.userId, userId));
    if (roleIds.length > 0) {
      await this.db.insert(schema.userRoles).values(roleIds.map((roleId) => ({ userId, roleId })));
    }
  }

  async deleteById(id: number): Promise<void> {
    await this.db.delete(schema.users).where(eq(schema.users.id, id));
  }

  private mapRows(
    rows: Array<{
      id: number;
      username: string;
      email: string;
      password: string;
      roleId: number | null;
      roleName: string | null;
    }>,
  ): User | null {
    if (rows.length === 0) return null;
    const first = rows[0]!;
    const roles = rows
      .filter((r) => r.roleId != null)
      .map((r) => ({ id: r.roleId!, name: r.roleName! }));
    return {
      id: first.id,
      username: first.username,
      email: first.email,
      password: first.password,
      roles,
    };
  }

  private mapAllRows(
    rows: Array<{
      id: number;
      username: string;
      email: string;
      password: string;
      roleId: number | null;
      roleName: string | null;
    }>,
  ): User[] {
    const map = new Map<number, User>();
    for (const row of rows) {
      if (!map.has(row.id)) {
        map.set(row.id, {
          id: row.id,
          username: row.username,
          email: row.email,
          password: row.password,
          roles: [],
        });
      }
      if (row.roleId != null) {
        map.get(row.id)!.roles.push({ id: row.roleId, name: row.roleName! });
      }
    }
    return Array.from(map.values());
  }
}
