import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(20, 'Username must be at most 20 characters'),
  email: z.string().email('Invalid email format').max(50, 'Email must be at most 50 characters'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(120, 'Password must be at most 120 characters'),
  roles: z.array(z.enum(['admin', 'moderator'])).optional(),
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
