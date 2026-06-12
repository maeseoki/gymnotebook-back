import { Stack } from 'expo-router'
import { AuthenticatedRouteGuard } from '@/features/auth/components/AuthGate'

export default function AuthenticatedLayout() {
  return (
    <AuthenticatedRouteGuard>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="exercises/new" options={{ title: 'New Exercise' }} />
        <Stack.Screen name="exercises/[id]/index" options={{ title: 'Exercise' }} />
        <Stack.Screen name="exercises/[id]/edit" options={{ title: 'Edit Exercise' }} />
        <Stack.Screen name="history/day/[date]" options={{ title: 'Day History' }} />
        <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
      </Stack>
    </AuthenticatedRouteGuard>
  )
}
