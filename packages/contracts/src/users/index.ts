import { z } from 'zod';

export const ERoleSchema = z.enum(['ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ADMIN']);
export type ERole = z.infer<typeof ERoleSchema>;

export const UserResponseSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  email: z.string(),
  roles: z.array(z.string()),
});
export type UserResponse = z.infer<typeof UserResponseSchema>;

export const MeResponseSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  email: z.string(),
  roles: z.array(z.string()),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const ModifyRoleRequestSchema = z.object({
  userId: z.number().int().positive(),
  newRole: ERoleSchema,
});
export type ModifyRoleRequest = z.infer<typeof ModifyRoleRequestSchema>;

export const UserParamSchema = z.object({
  username: z.string(),
  email: z.string(),
});
export type UserParam = z.infer<typeof UserParamSchema>;
