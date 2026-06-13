import { Stack } from 'expo-router'
import { AuthenticatedRouteGuard } from '@/features/auth/components/AuthGate'

export default function AuthenticatedLayout() {
  return (
    <AuthenticatedRouteGuard>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="exercises/new" options={{ title: 'Nuevo ejercicio' }} />
        <Stack.Screen name="exercises/[id]/index" options={{ title: 'Ejercicio' }} />
        <Stack.Screen name="exercises/[id]/edit" options={{ title: 'Editar ejercicio' }} />
        <Stack.Screen name="history/day/[date]" options={{ title: 'Historial del día' }} />
        <Stack.Screen name="settings/index" options={{ title: 'Ajustes' }} />
      </Stack>
    </AuthenticatedRouteGuard>
  )
}
