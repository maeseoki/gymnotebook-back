import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '@/shared/providers';
import '../global.css';

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="light" />
      <Slot />
    </AppProviders>
  );
}
