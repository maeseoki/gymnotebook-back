import { Link } from 'expo-router';
import { Button, Screen, Text } from '@/shared/ui/primitives';

export default function ExercisesScreen() {
  return (
    <Screen>
      <Text>Exercises foundation placeholder.</Text>
      <Link href="/(authenticated)/exercises/new" asChild>
        <Button label="New exercise" />
      </Link>
    </Screen>
  );
}
