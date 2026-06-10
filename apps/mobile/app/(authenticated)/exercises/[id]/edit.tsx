import { useLocalSearchParams } from 'expo-router';
import { Screen, Text } from '@/shared/ui/primitives';

export default function ExerciseEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen>
      <Text>Exercise edit foundation placeholder: {id}</Text>
    </Screen>
  );
}
