import type { ExerciseResponse } from '@gymnotebook/contracts'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { ExercisePicker } from '@/features/workout/components/ExercisePicker'
import { WorkoutExerciseCard } from '@/features/workout/components/WorkoutExerciseCard'
import { useActiveWorkoutDraft } from '@/features/workout/hooks/use-active-workout-draft'
import { useFinishWorkout } from '@/features/workout/hooks/use-finish-workout'
import { colors, radius, spacing } from '@/shared/theme/tokens'
import { Button, Card, ErrorState, LoadingIndicator, Screen, Text } from '@/shared/ui/primitives'

export default function WorkoutScreen() {
  const { t } = useTranslation()
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
  const [isEditing, setIsEditing] = useState(false)

  // Restore the draft on component mount (when Workout tab opens)
  useEffect(() => {
    restoreDraft()
  }, [restoreDraft])

  // Reset editing mode if draft is cleared
  useEffect(() => {
    if (!draft) {
      setIsEditing(false)
    }
  }, [draft])

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        onConfirm()
      }
    } else {
      Alert.alert(title, message, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), style: 'destructive', onPress: onConfirm },
      ])
    }
  }

  const handleDiscard = () => {
    confirmAction(
      t('workoutScreen.discardConfirmTitle'),
      t('workoutScreen.discardConfirmMsg'),
      () => {
        discardWorkout()
      },
    )
  }

  const handleStartNewWithConfirmation = () => {
    confirmAction(
      t('workoutScreen.discardConfirmTitle'),
      t('workoutScreen.discardConfirmMsg'),
      async () => {
        await discardWorkout()
        await startWorkout()
        setIsEditing(true)
      },
    )
  }

  const handleFinish = () => {
    if (!draft) return

    const totalSets = draft.exercises.reduce((acc, ex) => acc + ex.sets.length, 0)

    if (draft.exercises.length === 0 || totalSets === 0) {
      confirmAction(
        t('workoutScreen.emptyWorkoutTitle'),
        t('workoutScreen.emptyWorkoutMsg'),
        () => {
          discardWorkout()
        },
      )
      return
    }

    confirmAction(
      t('workoutScreen.finishConfirmTitle'),
      t('workoutScreen.finishConfirmMsg'),
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

  const handleStartWorkout = async () => {
    await startWorkout()
    setIsEditing(true)
  }

  // 1. Loading State
  if (isLoading) {
    return (
      <Screen style={styles.center}>
        <LoadingIndicator label={t('workoutScreen.loading')} />
      </Screen>
    )
  }

  // 2. Corrupted State Recovery
  if (isCorrupted) {
    return (
      <Screen style={styles.center}>
        <Card style={styles.corruptedCard}>
          <Text style={styles.corruptedTitle}>{t('workoutScreen.corruptedTitle')}</Text>
          <Text style={styles.corruptedDescription}>{t('workoutScreen.corruptedDescription')}</Text>
          <Button
            label={t('workoutScreen.discardDraft')}
            onPress={discardWorkout}
            accessibilityLabel={t('workoutScreen.discardDraft')}
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
          <Text style={styles.emptyTitle}>{t('workoutScreen.readyToTrain')}</Text>
          <Text style={styles.emptyDescription}>{t('workoutScreen.readyToTrainDesc')}</Text>
          <Button
            label={t('workoutScreen.startWorkout')}
            onPress={handleStartWorkout}
            accessibilityLabel={t('workoutScreen.startWorkout')}
          />
        </Card>
      </Screen>
    )
  }

  // 3.5. Resume / Summary State (Draft exists but not actively editing)
  if (draft && !isEditing) {
    const totalSets = draft.exercises.reduce((acc, ex) => acc + ex.sets.length, 0)
    return (
      <Screen style={styles.center}>
        <Card style={styles.resumeCard}>
          <Text style={styles.resumeTitle}>{t('workoutScreen.activeTitle')}</Text>
          <Text style={styles.resumeSubtitle}>{t('workoutScreen.activeSubtitle')}</Text>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('workoutScreen.exercisesLabel')}</Text>
              <Text style={styles.summaryValue}>{draft.exercises.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('workoutScreen.totalSets')}</Text>
              <Text style={styles.summaryValue}>{totalSets}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('workoutScreen.startedLabel')}</Text>
              <Text style={styles.summaryValue}>{formatStartedTime(draft.startedAt)}</Text>
            </View>
            {draft.updatedAt && draft.updatedAt !== draft.startedAt && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('workoutScreen.lastUpdate')}</Text>
                <Text style={styles.summaryValue}>{formatStartedTime(draft.updatedAt)}</Text>
              </View>
            )}
          </View>

          <View style={styles.resumeControls}>
            <Button
              label={t('workoutScreen.continueWorkout')}
              onPress={() => setIsEditing(true)}
              accessibilityLabel={t('workoutScreen.continueWorkout')}
            />
            <Button
              label={t('workoutScreen.discardWorkout')}
              onPress={handleDiscard}
              variant="outline"
              accessibilityLabel={t('workoutScreen.discardWorkout')}
            />
          </View>

          <Pressable
            onPress={handleStartNewWithConfirmation}
            accessibilityLabel={t('workoutScreen.startNewWorkoutClean')}
            style={({ pressed }: { pressed: boolean }) => [
              styles.startNewButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.startNewText}>{t('workoutScreen.startNewWorkout')}</Text>
          </Pressable>
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
            <Text style={styles.title}>{t('workoutScreen.title')}</Text>
            <Text style={styles.timeText}>
              {t('workoutScreen.startedAt', { time: formatStartedTime(draft.startedAt) })}
            </Text>
          </View>
        </View>

        {finishMutation.isError && (
          <ErrorState title={finishMutation.error?.message || t('workoutScreen.saveError')} />
        )}

        <View style={styles.exercisesContainer}>
          {draft.exercises.length === 0 ? (
            <Card style={styles.noExercisesCard}>
              <Text style={styles.noExercisesText}>{t('workoutScreen.noExercises')}</Text>
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
            label={t('workoutScreen.addExercise')}
            onPress={() => setPickerVisible(true)}
            variant="secondary"
            accessibilityLabel="Boton Añadir Ejercicio"
          />

          <View style={styles.actionRow}>
            <View style={{ flex: 1 }}>
              <Button
                label={t('workoutScreen.discard')}
                onPress={handleDiscard}
                variant="outline"
                accessibilityLabel="Boton Descartar Entrenamiento"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={t('workoutScreen.finish')}
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
  resumeCard: {
    width: '100%',
    padding: spacing[6],
    gap: spacing[4],
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  resumeTitle: {
    fontSize: 22,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.text,
    textAlign: 'center',
  },
  resumeSubtitle: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  summaryContainer: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing[4],
    gap: spacing[2],
    marginVertical: spacing[2],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textMuted,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  summaryValue: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  resumeControls: {
    gap: spacing[3],
    marginTop: spacing[2],
  },
  startNewButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    marginTop: spacing[2],
  },
  startNewText: {
    fontSize: 14,
    color: colors.textMuted,
    fontFamily: 'SpaceGrotesk_400Regular',
    textDecorationLine: 'underline',
  },
})
