import { db } from '@/config/database';
import { type NewUser, type User, roles, userRoles, users } from '@/database/schemas';
import { AuthenticationError, NotFoundError, ValidationError } from '@/shared/types';
import { comparePassword, hashPassword, omitFields } from '@/shared/utils';
import { and, eq } from 'drizzle-orm';
import type { LoginRequest, RegisterRequest } from './schemas';

export class AuthService {
  async login(data: LoginRequest) {
    // Find user with roles
    const userResult = await db
      .select({
        user: users,
        roleName: roles.name,
      })
      .from(users)
      .leftJoin(userRoles, eq(users.id, userRoles.userId))
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(users.username, data.username));

    if (userResult.length === 0) {
      throw new AuthenticationError('Invalid username or password');
    }

    const user = userResult[0].user;
    const userRolesList = userResult.map((r) => r.roleName).filter(Boolean) as string[];

    // Verify password
    const isPasswordValid = await comparePassword(data.password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid username or password');
    }

    // Return user without password and with roles
    return {
      ...omitFields(user, ['password']),
      roles: userRolesList,
    };
  }

  async register(data: RegisterRequest) {
    // Check if username or email already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(and(eq(users.username, data.username)))
      .limit(1);

    if (existingUser.length > 0) {
      throw new ValidationError('Username already exists');
    }

    const existingEmail = await db.select().from(users).where(eq(users.email, data.email)).limit(1);

    if (existingEmail.length > 0) {
      throw new ValidationError('Email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user
    const newUser: NewUser = {
      username: data.username,
      email: data.email,
      password: hashedPassword,
    };

    const [createdUser] = await db.insert(users).values(newUser).returning();

    // Assign roles
    const rolesToAssign = data.roles || [];
    const defaultRole = 'ROLE_USER';

    // Always assign USER role
    const userRole = await db.select().from(roles).where(eq(roles.name, defaultRole)).limit(1);

    if (userRole.length > 0) {
      await db.insert(userRoles).values({
        userId: createdUser.id,
        roleId: userRole[0].id,
      });
    }

    // Assign additional roles if provided
    for (const roleName of rolesToAssign) {
      const roleMapping = {
        admin: 'ROLE_ADMIN',
        moderator: 'ROLE_MODERATOR',
      };

      const mappedRoleName = roleMapping[roleName as keyof typeof roleMapping];
      if (mappedRoleName) {
        const roleRecord = await db
          .select()
          .from(roles)
          .where(eq(roles.name, mappedRoleName))
          .limit(1);

        if (roleRecord.length > 0) {
          await db.insert(userRoles).values({
            userId: createdUser.id,
            roleId: roleRecord[0].id,
          });
        }
      }
    }

    // Return user without password
    return omitFields(createdUser, ['password']);
  }

  async getUserById(id: number) {
    const userResult = await db
      .select({
        user: users,
        roleName: roles.name,
      })
      .from(users)
      .leftJoin(userRoles, eq(users.id, userRoles.userId))
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(users.id, id));

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
}
