import { useLocalSearchParams } from 'expo-router';
import { Screen, Text } from '@/shared/ui/primitives';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen>
      <Text>Exercise detail foundation placeholder: {id}</Text>
    </Screen>
  );
}
