import type { EExerciseType } from '@gymnotebook/contracts'
import { StyleSheet, View } from 'react-native'
import { colors, spacing } from '@/shared/theme/tokens'
import { Text } from '@/shared/ui/primitives'
import { formatSetValues } from '../utils/history-formatters'

interface HistorySetRowProps {
  set: {
    reps?: number | null
    weight?: number | null
    time?: number | null
    distance?: number | null
  }
  index: number
  exerciseType: EExerciseType
}

export function HistorySetRow({ set, index, exerciseType }: HistorySetRowProps) {
  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={`Serie ${index + 1}: ${formatSetValues(set, exerciseType)}`}
    >
      <Text style={styles.setNumber}>Serie {index + 1}</Text>
      <Text style={styles.setValues}>{formatSetValues(set, exerciseType)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  setNumber: {
    fontSize: 14,
    color: colors.textMuted,
    fontFamily: 'SpaceGrotesk_500Medium',
    width: 70,
  },
  setValues: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingLeft: spacing[2],
  },
})
