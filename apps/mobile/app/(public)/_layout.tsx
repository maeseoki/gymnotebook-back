import { Stack } from 'expo-router';
import { PublicRouteGuard } from '@/features/auth/components/AuthGate';

export default function PublicLayout() {
  return (
    <PublicRouteGuard>
      <Stack screenOptions={{ headerShown: false }} />
    </PublicRouteGuard>
  );
}
