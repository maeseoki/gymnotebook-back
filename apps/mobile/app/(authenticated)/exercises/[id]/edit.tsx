import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ExerciseForm, type ExerciseFormValues } from '@/features/exercises/components/ExerciseForm'
import { useExerciseDetail } from '@/features/exercises/hooks/use-exercise-detail'
import { useUpdateExerciseMutation } from '@/features/exercises/hooks/use-exercise-mutations'
import { mapExerciseError } from '@/features/exercises/utils/exercise-errors'
import { imagesApi } from '@/features/images/api/images-api'
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
    mutateAsync: updateExercise,
    isPending: isUpdating,
    error: updateError,
  } = useUpdateExerciseMutation(numericId)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (values: ExerciseFormValues) => {
    if (!exercise) return
    setSubmitError(null)
    const oldImageId = exercise.imageId
    const newImageId = values.imageId
    const isImageChanged = newImageId !== oldImageId

    try {
      await updateExercise(values)
      if (isImageChanged && oldImageId) {
        try {
          await imagesApi.delete(oldImageId)
        } catch {
          // The exercise update already succeeded; leave navigation behavior unchanged.
        }
      }
      router.replace(`/(authenticated)/exercises/${numericId}`)
    } catch (err) {
      const originalErrorMsg = mapExerciseError(err)
      setSubmitError(originalErrorMsg)

      if (isImageChanged && newImageId) {
        try {
          await imagesApi.delete(newImageId)
        } catch {
          setSubmitError(`${originalErrorMsg} (No se pudo limpiar la imagen huérfana).`)
        }
      }
    }
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

  const initialValues: Partial<ExerciseFormValues> = {}
  if (exercise) {
    initialValues.name = exercise.name
    initialValues.type = exercise.type
    initialValues.primaryMuscleGroup = exercise.primaryMuscleGroup
    if (exercise.description !== undefined) {
      initialValues.description = exercise.description
    }
    if (exercise.secondaryMuscleGroup !== undefined) {
      initialValues.secondaryMuscleGroup = exercise.secondaryMuscleGroup
    }
    if (exercise.imageId !== undefined) {
      initialValues.imageId = exercise.imageId
    }
  }

  return (
    <Screen>
      <ExerciseForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        loading={isUpdating}
        submitLabel="Save Changes"
        generalError={submitError || (updateError ? mapExerciseError(updateError) : null)}
      />
    </Screen>
  )
}
