import type { WorkoutResponse } from '@gymnotebook/contracts'
import { Pressable, StyleSheet, View } from 'react-native'
import { colors, spacing } from '@/shared/theme/tokens'
import { Card, Text } from '@/shared/ui/primitives'
import { formatDateTime } from '../utils/history-formatters'

interface HistoryWorkoutCardProps {
  workout: WorkoutResponse
  onPress: () => void
}

export function HistoryWorkoutCard({ workout, onPress }: HistoryWorkoutCardProps) {
  const exerciseNames = workout.workoutSets.map((ws) => ws.exercise.name).join(', ')

  const totalSets = workout.workoutSets.reduce((acc, ws) => acc + ws.sets.length, 0)

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver detalles del entrenamiento del ${formatDateTime(workout.startDate)}`}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.date}>{formatDateTime(workout.startDate)}</Text>
        </View>
        {workout.notes ? <Text style={styles.notes}>{workout.notes}</Text> : null}
        <Text numberOfLines={2} style={styles.exercises}>
          {exerciseNames || 'Sin ejercicios'}
        </Text>
        <Text style={styles.summary}>
          {workout.workoutSets.length}{' '}
          {workout.workoutSets.length === 1 ? 'ejercicio' : 'ejercicios'} • {totalSets}{' '}
          {totalSets === 1 ? 'serie' : 'series'}
        </Text>
      </Card>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[2],
  },
  pressed: {
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.primary,
  },
  notes: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  exercises: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_500Medium',
    color: colors.text,
  },
  summary: {
    fontSize: 12,
    color: colors.textMuted,
  },
})
