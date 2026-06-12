import type { MobileDeviceMetadata } from '@gymnotebook/contracts'
import { useMutation } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Platform } from 'react-native'
import { authService } from '@/features/auth/application/auth-service'
import type { LoginFormValues } from '@/features/auth/schemas/login-form'
import type { SignupFormValues } from '@/features/auth/schemas/signup-form'

export function useSignInAction() {
  return useMutation({
    mutationFn: (values: LoginFormValues) =>
      authService.signIn({ ...values, device: getDeviceMetadata() }),
    onSuccess: () => {
      router.replace('/(authenticated)/(tabs)')
    },
  })
}

export function useSignUpAction() {
  return useMutation({
    mutationFn: (values: SignupFormValues) =>
      authService.signUp({
        username: values.username,
        email: values.email,
        password: values.password,
        device: getDeviceMetadata(),
      }),
    onSuccess: () => {
      router.replace('/(authenticated)/(tabs)')
    },
  })
}

export function useLogoutAction() {
  return useMutation({
    mutationFn: () => authService.logOut(),
    onSettled: () => {
      router.replace('/(public)/login')
    },
  })
}

export function getDeviceMetadata(): MobileDeviceMetadata | undefined {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return { platform: Platform.OS }
  }

  return undefined
}
