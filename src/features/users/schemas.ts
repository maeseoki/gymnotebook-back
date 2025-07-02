import { z } from 'zod';

export const getUsersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const modifyRoleSchema = z.object({
  userId: z.number().int().positive(),
  newRole: z.enum(['ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ADMIN']),
});

export const deleteUserParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const verifyUserParamsSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
});

export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>;
export type ModifyRoleRequest = z.infer<typeof modifyRoleSchema>;
export type DeleteUserParams = z.infer<typeof deleteUserParamsSchema>;
export type VerifyUserParams = z.infer<typeof verifyUserParamsSchema>;
