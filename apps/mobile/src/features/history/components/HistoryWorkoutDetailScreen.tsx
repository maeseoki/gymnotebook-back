import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { normalizeApiError } from '@/shared/api/errors'
import { colors, spacing } from '@/shared/theme/tokens'
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingIndicator,
  Screen,
  Text,
} from '@/shared/ui/primitives'
import { useWorkoutDetail } from '../hooks/use-workout-detail'
import { getHistoryErrorMessage } from '../utils/history-errors'
import { formatDate, formatTimeRange } from '../utils/history-formatters'
import { HistoryExerciseCard } from './HistoryExerciseCard'

interface HistoryWorkoutDetailScreenProps {
  date: string
}

export function HistoryWorkoutDetailScreen({ date }: HistoryWorkoutDetailScreenProps) {
  const { data: workouts, isLoading, error, refetch, isFetching } = useWorkoutDetail(date)

  const formattedDate = formatDate(date)

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <Text style={styles.title}>{formattedDate || date}</Text>

        {isLoading ? (
          <View style={styles.center}>
            <LoadingIndicator label="Cargando detalles..." />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <ErrorState title={getHistoryErrorMessage(normalizeApiError(error))} />
            <View style={{ marginTop: spacing[4], width: '100%' }}>
              <Button label="Reintentar" onPress={() => refetch()} />
            </View>
          </View>
        ) : workouts && workouts.length > 0 ? (
          workouts.map((workout) => (
            <View key={workout.uuid} style={styles.workoutContainer}>
              <View style={styles.workoutHeader}>
                <Text style={styles.timeRange}>
                  {formatTimeRange(workout.startDate, workout.endDate)}
                </Text>
                {workout.notes ? <Text style={styles.notes}>{workout.notes}</Text> : null}
              </View>

              <View style={styles.exercisesList}>
                {workout.workoutSets.map((ws) => (
                  <HistoryExerciseCard key={ws.id} workoutSet={ws} />
                ))}
              </View>
            </View>
          ))
        ) : (
          <EmptyState title="No se encontraron entrenamientos para este día." />
        )}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 0,
  },
  scrollContent: {
    paddingBottom: spacing[4],
    gap: spacing[4],
  },
  title: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.text,
    marginBottom: spacing[2],
  },
  center: {
    paddingVertical: spacing[8],
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutContainer: {
    gap: spacing[3],
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: spacing[3],
  },
  workoutHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing[2],
  },
  timeRange: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.primary,
  },
  notes: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing[1],
  },
  exercisesList: {
    gap: spacing[3],
  },
})
