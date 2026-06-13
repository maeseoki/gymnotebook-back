import { MobileSignUpRequestSchema } from '@gymnotebook/contracts'
import { z } from 'zod'

export function createSignupFormSchema(t: (key: string) => string) {
  return MobileSignUpRequestSchema.pick({
    username: true,
    email: true,
    password: true,
  })
    .extend({
      confirmPassword: z.string().min(1, t('auth.errors.confirmPasswordRequired')),
    })
    .refine((value) => value.password === value.confirmPassword, {
      path: ['confirmPassword'],
      message: t('auth.errors.passwordsDoNotMatch'),
    })
}

export type SignupFormValues = z.infer<ReturnType<typeof createSignupFormSchema>>
