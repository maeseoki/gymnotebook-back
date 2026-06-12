import type { ExerciseResponse } from '@gymnotebook/contracts'
import { useEffect, useState } from 'react'
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { ExercisePicker } from '@/features/workout/components/ExercisePicker'
import { WorkoutExerciseCard } from '@/features/workout/components/WorkoutExerciseCard'
import { useActiveWorkoutDraft } from '@/features/workout/hooks/use-active-workout-draft'
import { useFinishWorkout } from '@/features/workout/hooks/use-finish-workout'
import { colors, spacing } from '@/shared/theme/tokens'
import { Button, Card, ErrorState, LoadingIndicator, Screen, Text } from '@/shared/ui/primitives'

export default function WorkoutScreen() {
  const {
    draft,
    isLoading,
    isCorrupted,
    restoreDraft,
    startWorkout,
    addExercise,
    removeExercise,
    addSet,
    updateSet,
    deleteSet,
    discardWorkout,
  } = useActiveWorkoutDraft()

  const finishMutation = useFinishWorkout()
  const [pickerVisible, setPickerVisible] = useState(false)

  // Restore the draft on component mount (when Workout tab opens)
  useEffect(() => {
    restoreDraft()
  }, [restoreDraft])

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        onConfirm()
      }
    } else {
      Alert.alert(title, message, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', style: 'destructive', onPress: onConfirm },
      ])
    }
  }

  const handleDiscard = () => {
    confirmAction(
      '¿Descartar entrenamiento?',
      '¿Estás seguro de que quieres descartar este entrenamiento? Todos los datos se perderán de forma permanente.',
      () => {
        discardWorkout()
      },
    )
  }

  const handleFinish = () => {
    if (!draft) return

    const totalSets = draft.exercises.reduce((acc, ex) => acc + ex.sets.length, 0)

    if (draft.exercises.length === 0 || totalSets === 0) {
      confirmAction(
        'Entrenamiento vacío',
        'No puedes guardar un entrenamiento sin series registradas. ¿Quieres descartarlo?',
        () => {
          discardWorkout()
        },
      )
      return
    }

    confirmAction(
      '¿Finalizar entrenamiento?',
      '¿Deseas guardar y finalizar el entrenamiento actual?',
      () => {
        finishMutation.mutate()
      },
    )
  }

  const handleSelectExercise = (exercise: ExerciseResponse) => {
    addExercise(exercise.id, exercise.name, exercise.type)
  }

  const formatStartedTime = (isoString: string) => {
    const date = new Date(isoString)
    return (
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
      ' - ' +
      date.toLocaleDateString()
    )
  }

  // 1. Loading State
  if (isLoading) {
    return (
      <Screen style={styles.center}>
        <LoadingIndicator label="Cargando entrenamiento..." />
      </Screen>
    )
  }

  // 2. Corrupted State Recovery
  if (isCorrupted) {
    return (
      <Screen style={styles.center}>
        <Card style={styles.corruptedCard}>
          <Text style={styles.corruptedTitle}>Entrenamiento corrupto</Text>
          <Text style={styles.corruptedDescription}>
            Se ha detectado un borrador de entrenamiento corrupto o incompatible localmente.
          </Text>
          <Button
            label="Descartar borrador y empezar de nuevo"
            onPress={discardWorkout}
            accessibilityLabel="Descartar borrador corrupto"
          />
        </Card>
      </Screen>
    )
  }

  // 3. Empty State (No Active Workout)
  if (!draft) {
    return (
      <Screen style={styles.center}>
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>¿Listo para entrenar?</Text>
          <Text style={styles.emptyDescription}>
            Empieza a registrar tus series, repeticiones y pesos en tiempo real.
          </Text>
          <Button
            label="Comenzar Entrenamiento"
            onPress={startWorkout}
            accessibilityLabel="Comenzar Entrenamiento"
          />
        </Card>
      </Screen>
    )
  }

  // 4. Active Workout State
  const alreadySelectedIds = draft.exercises.map((e) => e.exerciseId)

  return (
    <Screen style={{ padding: 0 }}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Entrenamiento en marcha</Text>
            <Text style={styles.timeText}>Iniciado: {formatStartedTime(draft.startedAt)}</Text>
          </View>
        </View>

        {finishMutation.isError && (
          <ErrorState
            title={finishMutation.error?.message || 'Error al guardar el entrenamiento'}
          />
        )}

        <View style={styles.exercisesContainer}>
          {draft.exercises.length === 0 ? (
            <Card style={styles.noExercisesCard}>
              <Text style={styles.noExercisesText}>
                No has añadido ningún ejercicio. ¡Añade uno para empezar a registrar series!
              </Text>
            </Card>
          ) : (
            draft.exercises.map((exercise) => (
              <WorkoutExerciseCard
                key={exercise.draftExerciseId}
                exercise={exercise}
                onRemoveExercise={() => removeExercise(exercise.draftExerciseId)}
                onAddSet={(fields) => addSet(exercise.draftExerciseId, fields)}
                onUpdateSet={(draftSetId, fields) =>
                  updateSet(exercise.draftExerciseId, draftSetId, fields)
                }
                onDeleteSet={(draftSetId) => deleteSet(exercise.draftExerciseId, draftSetId)}
              />
            ))
          )}
        </View>

        <View style={styles.controls}>
          <Button
            label="Añadir Ejercicio"
            onPress={() => setPickerVisible(true)}
            variant="secondary"
            accessibilityLabel="Boton Añadir Ejercicio"
          />

          <View style={styles.actionRow}>
            <View style={{ flex: 1 }}>
              <Button
                label="Descartar"
                onPress={handleDiscard}
                variant="outline"
                accessibilityLabel="Boton Descartar Entrenamiento"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Finalizar"
                onPress={handleFinish}
                loading={finishMutation.isPending}
                accessibilityLabel="Boton Finalizar Entrenamiento"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <ExercisePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleSelectExercise}
        alreadySelectedIds={alreadySelectedIds}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  scrollContainer: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
    marginTop: spacing[4],
  },
  title: {
    fontSize: 22,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  timeText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing[1],
  },
  exercisesContainer: {
    marginVertical: spacing[2],
  },
  emptyCard: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
    gap: spacing[4],
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
    textAlign: 'center',
  },
  emptyDescription: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  corruptedCard: {
    width: '100%',
    borderColor: colors.danger,
    padding: spacing[6],
    gap: spacing[4],
  },
  corruptedTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.danger,
  },
  corruptedDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  noExercisesCard: {
    padding: spacing[4],
    alignItems: 'center',
  },
  noExercisesText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  controls: {
    marginTop: spacing[4],
    gap: spacing[3],
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
})
