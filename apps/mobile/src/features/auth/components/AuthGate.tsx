import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { useAuthSessionStore } from '@/shared/auth/session-store';
import { LoadingIndicator, Screen } from '@/shared/ui/primitives';

export function AuthenticatedRouteGuard({ children }: { children: ReactNode }): ReactNode {
  const status = useAuthSessionStore((state) => state.status);

  if (status === 'restoring') {
    return <AuthLoadingScreen />;
  }

  if (status !== 'authenticated') {
    return <Redirect href="/(public)/login" />;
  }

  return children;
}

export function PublicRouteGuard({ children }: { children: ReactNode }): ReactNode {
  const status = useAuthSessionStore((state) => state.status);

  if (status === 'restoring') {
    return <AuthLoadingScreen />;
  }

  if (status === 'authenticated') {
    return <Redirect href="/(authenticated)/(tabs)" />;
  }

  return children;
}

function AuthLoadingScreen(): ReactNode {
  return (
    <Screen style={{ alignItems: 'center', justifyContent: 'center' }}>
      <LoadingIndicator label="Restoring session" />
    </Screen>
  );
}
