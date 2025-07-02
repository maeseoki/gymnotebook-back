import { db } from '@/config/database';
import { type User, roles, userRoles, users } from '@/database/schemas';
import { NotFoundError, type PaginationParams, ValidationError } from '@/shared/types';
import { omitFields } from '@/shared/utils';
import { and, count, eq, or } from 'drizzle-orm';
import type {
  DeleteUserParams,
  GetUsersQuery,
  ModifyRoleRequest,
  VerifyUserParams,
} from './schemas';

export class UserService {
  async getAllUsers(pagination: PaginationParams) {
    const offset = (pagination.page - 1) * pagination.limit;

    // Get total count
    const [totalResult] = await db.select({ count: count() }).from(users);
    const total = totalResult.count;

    // Get users with their roles
    const userResults = await db
      .select({
        user: users,
        roleName: roles.name,
      })
      .from(users)
      .leftJoin(userRoles, eq(users.id, userRoles.userId))
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .limit(pagination.limit)
      .offset(offset);

    // Group users by ID to consolidate roles
    const userMap = new Map<
      number,
      {
        id: number;
        username: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        roles: string[];
      }
    >();
    for (const result of userResults) {
      const userId = result.user.id;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          ...omitFields(result.user, ['password']),
          roles: [],
        });
      }
      if (result.roleName) {
        userMap.get(userId)!.roles.push(result.roleName);
      }
    }

    return {
      users: Array.from(userMap.values()),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        pages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async verifyUsernameAndEmail(params: VerifyUserParams) {
    const existingUser = await db
      .select()
      .from(users)
      .where(or(eq(users.username, params.username), eq(users.email, params.email)))
      .limit(1);

    return {
      usernameExists: existingUser.some((u) => u.username === params.username),
      emailExists: existingUser.some((u) => u.email === params.email),
    };
  }

  async getCurrentUser(userId: number) {
    const userResult = await db
      .select({
        user: users,
        roleName: roles.name,
      })
      .from(users)
      .leftJoin(userRoles, eq(users.id, userRoles.userId))
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(users.id, userId));

    if (userResult.length === 0) {
      throw new NotFoundError('User not found');
    }

    const user = userResult[0].user;
    const userRolesList = userResult.map((r) => r.roleName).filter(Boolean) as string[];

    return {
      ...omitFields(user, ['password']),
      roles: userRolesList,
    };
  }

  async setPermissions(data: ModifyRoleRequest) {
    // Check if user exists
    const userExists = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);

    if (userExists.length === 0) {
      throw new ValidationError('User does not exist');
    }

    // Get the role ID
    const roleRecord = await db.select().from(roles).where(eq(roles.name, data.newRole)).limit(1);

    if (roleRecord.length === 0) {
      throw new ValidationError('Role does not exist');
    }

    // Check if user already has this role
    const existingUserRole = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, data.userId), eq(userRoles.roleId, roleRecord[0].id)))
      .limit(1);

    if (existingUserRole.length > 0) {
      throw new ValidationError('User already has this role');
    }

    // Add the role
    await db.insert(userRoles).values({
      userId: data.userId,
      roleId: roleRecord[0].id,
    });

    return { success: true, message: 'Role assigned successfully' };
  }

  async removePermissions(data: ModifyRoleRequest) {
    // Check if user exists
    const userExists = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);

    if (userExists.length === 0) {
      throw new ValidationError('User does not exist');
    }

    // Get the role ID
    const roleRecord = await db.select().from(roles).where(eq(roles.name, data.newRole)).limit(1);

    if (roleRecord.length === 0) {
      throw new ValidationError('Role does not exist');
    }

    // Check if user has this role
    const existingUserRole = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, data.userId), eq(userRoles.roleId, roleRecord[0].id)))
      .limit(1);

    if (existingUserRole.length === 0) {
      throw new ValidationError('User does not have this role');
    }

    // Remove the role
    await db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, data.userId), eq(userRoles.roleId, roleRecord[0].id)));

    return { success: true, message: 'Role removed successfully' };
  }

  async deleteUser(params: DeleteUserParams) {
    // Check if user exists
    const userExists = await db.select().from(users).where(eq(users.id, params.id)).limit(1);

    if (userExists.length === 0) {
      throw new NotFoundError('User not found');
    }

    // Delete user (cascade will handle user_roles)
    await db.delete(users).where(eq(users.id, params.id));

    return { success: true, message: 'User deleted successfully' };
  }
}
