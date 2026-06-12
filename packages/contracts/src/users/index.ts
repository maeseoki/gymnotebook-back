import { z } from 'zod'

export const ERoleSchema = z.enum(['ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ADMIN'])
export type ERole = z.infer<typeof ERoleSchema>

export const ElevatedRoleSchema = z.enum(['ROLE_MODERATOR', 'ROLE_ADMIN'])
export type ElevatedRole = z.infer<typeof ElevatedRoleSchema>

export const UserResponseSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  email: z.string(),
  roles: z.array(ERoleSchema),
})
export type UserResponse = z.infer<typeof UserResponseSchema>

export const MeResponseSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  email: z.string(),
  roles: z.array(ERoleSchema),
})
export type MeResponse = z.infer<typeof MeResponseSchema>

export const ModifyRoleRequestSchema = z.strictObject({
  userId: z.number().int().positive(),
  newRole: ElevatedRoleSchema,
})
export type ModifyRoleRequest = z.infer<typeof ModifyRoleRequestSchema>

export const UserParamSchema = z.object({
  username: z.string(),
  email: z.string(),
})
export type UserParam = z.infer<typeof UserParamSchema>

export const VerifyUserAvailabilityQuerySchema = z.strictObject({
  username: z.string().min(1),
  email: z.string().email(),
})
export type VerifyUserAvailabilityQuery = z.infer<typeof VerifyUserAvailabilityQuerySchema>

export const UserAvailabilityResponseSchema = z.object({
  usernameAvailable: z.boolean(),
  emailAvailable: z.boolean(),
})
export type UserAvailabilityResponse = z.infer<typeof UserAvailabilityResponseSchema>
