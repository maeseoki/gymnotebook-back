import { MobileSignUpRequestSchema } from '@gymnotebook/contracts'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

export const signupFormSchema = MobileSignUpRequestSchema.pick({
  username: true,
  email: true,
  password: true,
})
  .extend({
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords must match',
  })

export type SignupFormValues = z.infer<typeof signupFormSchema>

export const signupFormResolver = zodResolver(signupFormSchema)
