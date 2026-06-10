import { useLocalSearchParams } from 'expo-router';
import { Screen, Text } from '@/shared/ui/primitives';

export default function HistoryDayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  return (
    <Screen>
      <Text>History day foundation placeholder: {date}</Text>
    </Screen>
  );
}
