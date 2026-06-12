import { useRouter } from 'expo-router'
import { useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native'
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
import { useWorkoutHistory } from '../hooks/use-workout-history'
import { getHistoryErrorMessage } from '../utils/history-errors'
import { formatLocalDateKey } from '../utils/history-formatters'
import { HistoryWorkoutCard } from './HistoryWorkoutCard'

export function HistoryListScreen() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(() => new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  const { data: workouts, isLoading, error, refetch, isFetching } = useWorkoutHistory(year, month)

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1))
  }

  const getMonthName = (date: Date) => {
    const months = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ]
    return `${months[date.getMonth()]} ${date.getFullYear()}`
  }

  const navigateToDetail = (startDateStr: string) => {
    const dateStr = formatLocalDateKey(startDateStr)
    if (!dateStr) return
    router.push(`/(authenticated)/history/day/${dateStr}`)
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={handlePrevMonth}
          style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
        >
          <Text style={styles.navButtonText}>{'<'}</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{getMonthName(currentDate)}</Text>
        <Pressable
          onPress={handleNextMonth}
          style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
        >
          <Text style={styles.navButtonText}>{'>'}</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <LoadingIndicator label="Cargando historial..." />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ErrorState title={getHistoryErrorMessage(normalizeApiError(error))} />
          <View style={{ marginTop: spacing[4], width: '100%' }}>
            <Button label="Reintentar" onPress={() => refetch()} />
          </View>
        </View>
      ) : workouts && workouts.length > 0 ? (
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.uuid}
          renderItem={({ item }) => (
            <HistoryWorkoutCard workout={item} onPress={() => navigateToDetail(item.startDate)} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          ListEmptyComponent={<EmptyState title="No hay entrenamientos registrados en este mes." />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    marginBottom: spacing[2],
  },
  monthTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.text,
  },
  navButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },
  navButtonText: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
})
