import { useLocalSearchParams } from 'expo-router';
import { HistoryWorkoutDetailScreen } from '@/features/history/components/HistoryWorkoutDetailScreen';

export default function HistoryDayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();

  if (!date) return null;

  return <HistoryWorkoutDetailScreen date={date} />;
}
