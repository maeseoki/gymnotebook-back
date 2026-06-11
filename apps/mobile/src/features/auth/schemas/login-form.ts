import { MobileSignInRequestSchema } from '@gymnotebook/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

export const loginFormSchema = MobileSignInRequestSchema.pick({
  username: true,
  password: true,
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const loginFormResolver = zodResolver(loginFormSchema);
