import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ExerciseForm, type ExerciseFormValues } from '@/features/exercises/components/ExerciseForm'
import { useExerciseDetail } from '@/features/exercises/hooks/use-exercise-detail'
import { useUpdateExerciseMutation } from '@/features/exercises/hooks/use-exercise-mutations'
import { mapExerciseError } from '@/features/exercises/utils/exercise-errors'
import { spacing } from '@/shared/theme/tokens'
import { Button, ErrorState, LoadingIndicator, Screen } from '@/shared/ui/primitives'

export default function ExerciseEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const numericId = Number(id)
  const isValidId = id !== undefined && !Number.isNaN(numericId) && numericId > 0

  const {
    data: exercise,
    isLoading: isLoadingDetail,
    error: detailError,
  } = useExerciseDetail(numericId)
  const {
    mutate: updateExercise,
    isPending: isUpdating,
    error: updateError,
  } = useUpdateExerciseMutation(numericId)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = (values: ExerciseFormValues) => {
    setSubmitError(null)
    updateExercise(values, {
      onSuccess: () => {
        router.replace(`/(authenticated)/exercises/${numericId}`)
      },
      onError: (err) => {
        setSubmitError(mapExerciseError(err))
      },
    })
  }

  if (!isValidId) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <ErrorState title="Invalid Exercise ID" />
        <Button
          label="Back to exercises"
          onPress={() => router.replace('/(authenticated)/(tabs)/exercises')}
        />
      </Screen>
    )
  }

  if (isLoadingDetail) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }}>
        <LoadingIndicator label="Loading exercise data" />
      </Screen>
    )
  }

  if (detailError || !exercise) {
    return (
      <Screen style={{ justifyContent: 'center', gap: spacing[4] }}>
        <ErrorState title={detailError ? mapExerciseError(detailError) : 'Exercise not found.'} />
        <Button
          label="Back to exercises"
          onPress={() => router.replace('/(authenticated)/(tabs)/exercises')}
        />
      </Screen>
    )
  }

  return (
    <Screen>
      <ExerciseForm
        initialValues={{
          name: exercise.name,
          description: exercise.description,
          type: exercise.type,
          primaryMuscleGroup: exercise.primaryMuscleGroup,
          secondaryMuscleGroup: exercise.secondaryMuscleGroup,
          imageId: exercise.imageId,
        }}
        onSubmit={handleSubmit}
        loading={isUpdating}
        submitLabel="Save Changes"
        generalError={submitError || (updateError ? mapExerciseError(updateError) : null)}
      />
    </Screen>
  )
}
