import { Slot } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AuthBootstrap } from '@/features/auth/components/AuthBootstrap'
import { AppProviders } from '@/shared/providers'
import '../global.css'

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="light" />
      <AuthBootstrap>
        <Slot />
      </AuthBootstrap>
    </AppProviders>
  )
}
