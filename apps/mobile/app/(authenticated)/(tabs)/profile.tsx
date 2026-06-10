import { Link } from 'expo-router';
import { Button, Screen, Text } from '@/shared/ui/primitives';

export default function ProfileScreen() {
  return (
    <Screen>
      <Text>Profile foundation placeholder.</Text>
      <Link href="/(authenticated)/settings" asChild>
        <Button label="Settings" variant="outline" />
      </Link>
    </Screen>
  );
}
