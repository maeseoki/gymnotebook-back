import type { ExerciseResponse } from '@gymnotebook/contracts'
import { Pressable, View } from 'react-native'
import { colors, radius, spacing } from '@/shared/theme/tokens'
import { Card, Text } from '@/shared/ui/primitives'

interface ExerciseCardProps {
  exercise: ExerciseResponse
  onPress: () => void
}

export function ExerciseCard({ exercise, onPress }: ExerciseCardProps) {
  const typeDisplay = exercise.type.replace('_', ' & ').toLowerCase()
  const primaryMuscle = exercise.primaryMuscleGroup.replace('_', ' ').toLowerCase()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Exercise: ${exercise.name}`}
    >
      <Card style={{ marginBottom: spacing[2], gap: spacing[1] }}>
        <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16 }}>{exercise.name}</Text>
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[1] }}
        >
          <View
            style={{
              backgroundColor: colors.surfaceMuted,
              paddingHorizontal: spacing[2],
              paddingVertical: 2,
              borderRadius: radius.sm,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.primary, textTransform: 'capitalize' }}>
              {typeDisplay}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: colors.surfaceMuted,
              paddingHorizontal: spacing[2],
              paddingVertical: 2,
              borderRadius: radius.sm,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.secondary, textTransform: 'capitalize' }}>
              {primaryMuscle}
            </Text>
          </View>
        </View>
        {exercise.description ? (
          <Text
            numberOfLines={2}
            style={{ fontSize: 14, color: colors.textMuted, marginTop: spacing[1] }}
          >
            {exercise.description}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  )
}
