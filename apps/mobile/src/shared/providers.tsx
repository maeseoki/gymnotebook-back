import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/space-grotesk'
import { QueryClientProvider } from '@tanstack/react-query'
import * as SplashScreen from 'expo-splash-screen'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { loadPersistedLanguage } from '@/shared/i18n'
import { createMobileQueryClient } from '@/shared/query/client'
import { LoadingIndicator } from '@/shared/ui/primitives'

void SplashScreen.preventAutoHideAsync()

const queryClient = createMobileQueryClient()

export function AppProviders({ children }: { children: ReactNode }): ReactNode {
  const { t } = useTranslation()
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function prepare() {
      try {
        await loadPersistedLanguage()
      } catch {
        // i18n already has a synchronous fallback language.
      } finally {
        if (fontsLoaded || fontError) {
          setReady(true)
          void SplashScreen.hideAsync()
        }
      }
    }
    prepare()
  }, [fontError, fontsLoaded])

  if (!ready) {
    return <LoadingIndicator label={t('common.loading')} />
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SafeAreaProvider>
  )
}
