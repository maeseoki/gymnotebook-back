import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/space-grotesk';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createMobileQueryClient } from '@/shared/query/client';
import { LoadingIndicator } from '@/shared/ui/primitives';

void SplashScreen.preventAutoHideAsync();

const queryClient = createMobileQueryClient();

export function AppProviders({ children }: { children: ReactNode }): ReactNode {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      setReady(true);
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!ready) {
    return <LoadingIndicator label="Loading application" />;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SafeAreaProvider>
  );
}
