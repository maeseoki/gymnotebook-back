import { Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { AuthenticatedRouteGuard } from '@/features/auth/components/AuthGate'

export default function AuthenticatedLayout() {
  const { t } = useTranslation()

  return (
    <AuthenticatedRouteGuard>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="exercises/new"
          options={{ title: t('exercisesScreen.newExerciseTitle') }}
        />
        <Stack.Screen name="exercises/[id]/index" options={{ title: t('exerciseDetail.title') }} />
        <Stack.Screen
          name="exercises/[id]/edit"
          options={{ title: t('exerciseDetail.editExercise') }}
        />
        <Stack.Screen
          name="history/day/[date]"
          options={{ title: t('historyScreen.dayHistoryTitle') }}
        />
        <Stack.Screen name="settings/index" options={{ title: t('settingsScreen.title') }} />
      </Stack>
    </AuthenticatedRouteGuard>
  )
}
