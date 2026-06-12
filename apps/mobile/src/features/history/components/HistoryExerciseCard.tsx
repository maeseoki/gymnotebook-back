import type { WorkoutSetResponse } from '@gymnotebook/contracts';
import { StyleSheet, View } from 'react-native';
import { spacing } from '@/shared/theme/tokens';
import { Card, Text } from '@/shared/ui/primitives';
import { HistorySetRow } from './HistorySetRow';

interface HistoryExerciseCardProps {
  workoutSet: WorkoutSetResponse;
}

export function HistoryExerciseCard({ workoutSet }: HistoryExerciseCardProps) {
  const { exercise, sets } = workoutSet;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{exercise.name}</Text>
      <View style={styles.setsList}>
        {sets.map((set, idx) => (
          <HistorySetRow key={set.id ?? idx} set={set} index={idx} exerciseType={exercise.type} />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[2],
  },
  title: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  setsList: {
    marginTop: spacing[1],
  },
});
