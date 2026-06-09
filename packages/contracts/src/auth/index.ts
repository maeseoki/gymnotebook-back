import { z } from 'zod';
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
