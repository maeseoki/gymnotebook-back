import { MobileSignInRequestSchema } from '@gymnotebook/contracts'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'

export const mobileSignInFormSchema = MobileSignInRequestSchema.pick({
  username: true,
  password: true,
})

export type MobileSignInFormValues = z.infer<typeof mobileSignInFormSchema>

export const mobileSignInResolver = zodResolver(mobileSignInFormSchema)
