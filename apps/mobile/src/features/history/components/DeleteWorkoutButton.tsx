import { ActivityIndicator, Alert, Pressable, StyleSheet } from 'react-native'
import { normalizeApiError } from '@/shared/api/errors'
import { colors, spacing } from '@/shared/theme/tokens'
import { Text } from '@/shared/ui/primitives'
import { useDeleteWorkout } from '../hooks/use-delete-workout'
import { getHistoryErrorMessage } from '../utils/history-errors'

interface DeleteWorkoutButtonProps {
  workoutId: number
}

export function DeleteWorkoutButton({ workoutId }: DeleteWorkoutButtonProps) {
  const { mutate: deleteWorkout, isPending } = useDeleteWorkout()

  const handleDelete = () => {
    Alert.alert(
      'Eliminar entrenamiento',
      '¿Estás seguro de que deseas eliminar por completo este entrenamiento? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteWorkout(workoutId, {
              onError: (err) => {
                const apiFailure = normalizeApiError(err)
                const msg = getHistoryErrorMessage(apiFailure)
                Alert.alert('Error', msg)
              },
            })
          },
        },
      ],
    )
  }

  return (
    <Pressable
      onPress={handleDelete}
      disabled={isPending}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Eliminar entrenamiento completo"
    >
      {isPending ? (
        <ActivityIndicator size="small" color={colors.danger} />
      ) : (
        <Text style={styles.text}>Eliminar</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    fontSize: 13,
    color: colors.danger,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
})
