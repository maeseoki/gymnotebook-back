import { z } from 'zod';
import { IsoInstantStringSchema } from '../common/index.js';
import { ERoleSchema } from '../users/index.js';

export const LoginRequestSchema = z.strictObject({
  username: z.string().min(1),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const SignupRequestSchema = z.strictObject({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9]+$/, 'Username must be alphanumeric'),
  email: z.string().email().max(50),
  password: z.string().min(6).max(40),
});
export type SignupRequest = z.infer<typeof SignupRequestSchema>;

export const JwtResponseSchema = z.object({
  token: z.string(),
  type: z.literal('Bearer'),
  id: z.number().int(),
  username: z.string(),
  email: z.string(),
  roles: z.array(ERoleSchema),
});
export type JwtResponse = z.infer<typeof JwtResponseSchema>;

export const MobileDevicePlatformSchema = z.enum(['android', 'ios']);
export type MobileDevicePlatform = z.infer<typeof MobileDevicePlatformSchema>;

export const MobileDeviceMetadataSchema = z.strictObject({
  name: z.string().trim().min(1).max(80).optional(),
  platform: MobileDevicePlatformSchema.optional(),
});
export type MobileDeviceMetadata = z.infer<typeof MobileDeviceMetadataSchema>;

export const MobileSignInRequestSchema = z.strictObject({
  username: z.string().min(1),
  password: z.string().min(1),
  device: MobileDeviceMetadataSchema.optional(),
});
export type MobileSignInRequest = z.infer<typeof MobileSignInRequestSchema>;

export const MobileSignUpRequestSchema = SignupRequestSchema.extend({
  device: MobileDeviceMetadataSchema.optional(),
}).strict();
export type MobileSignUpRequest = z.infer<typeof MobileSignUpRequestSchema>;

export const MobileUserSchema = z.strictObject({
  id: z.number().int(),
  username: z.string(),
  email: z.string(),
  roles: z.array(ERoleSchema),
});
export type MobileUser = z.infer<typeof MobileUserSchema>;

export const MobileTokenPairResponseSchema = z.strictObject({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessTokenExpiresAt: IsoInstantStringSchema,
  refreshTokenExpiresAt: IsoInstantStringSchema,
  user: MobileUserSchema,
});
export type MobileTokenPairResponse = z.infer<typeof MobileTokenPairResponseSchema>;

export const MobileRefreshRequestSchema = z.strictObject({
  refreshToken: z.string().min(32).max(512),
});
export type MobileRefreshRequest = z.infer<typeof MobileRefreshRequestSchema>;

export const MobileLogoutRequestSchema = z.strictObject({
  refreshToken: z.string().min(32).max(512),
});
export type MobileLogoutRequest = z.infer<typeof MobileLogoutRequestSchema>;

export const MobileSessionResponseSchema = z.strictObject({
  id: z.uuid(),
  deviceName: z.string().max(80).nullable(),
  devicePlatform: MobileDevicePlatformSchema.nullable(),
  createdAt: IsoInstantStringSchema,
  lastUsedAt: IsoInstantStringSchema,
  expiresAt: IsoInstantStringSchema,
  current: z.boolean(),
});
export type MobileSessionResponse = z.infer<typeof MobileSessionResponseSchema>;

export const MobileSessionsResponseSchema = z.strictObject({
  sessions: z.array(MobileSessionResponseSchema),
});
export type MobileSessionsResponse = z.infer<typeof MobileSessionsResponseSchema>;

export const MobileSessionIdParamSchema = z.strictObject({
  sessionId: z.uuid(),
});
export type MobileSessionIdParam = z.infer<typeof MobileSessionIdParamSchema>;

const QueryBooleanSchema = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => value === true || value === 'true');

export const MobileRevokeAllSessionsQuerySchema = z.strictObject({
  keepCurrent: QueryBooleanSchema.default(false),
});
export type MobileRevokeAllSessionsQuery = z.infer<typeof MobileRevokeAllSessionsQuerySchema>;

export const MobileRevokeAllSessionsResponseSchema = z.strictObject({
  revoked: z.number().int().min(0),
});
export type MobileRevokeAllSessionsResponse = z.infer<typeof MobileRevokeAllSessionsResponseSchema>;
