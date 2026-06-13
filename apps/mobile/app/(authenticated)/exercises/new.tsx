import { router } from 'expo-router'
import { useState } from 'react'
import { ExerciseForm, type ExerciseFormValues } from '@/features/exercises/components/ExerciseForm'
import { useCreateExerciseMutation } from '@/features/exercises/hooks/use-exercise-mutations'
import { mapExerciseError } from '@/features/exercises/utils/exercise-errors'
import { imagesApi } from '@/features/images/api/images-api'
import { Screen } from '@/shared/ui/primitives'

export default function NewExerciseScreen() {
  const { mutateAsync, isPending, error } = useCreateExerciseMutation()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (values: ExerciseFormValues) => {
    setSubmitError(null)
    try {
      const data = await mutateAsync(values)
      if (data && typeof data.id === 'number') {
        router.replace(`/(authenticated)/exercises/${data.id}`)
      } else {
        router.replace('/(authenticated)/(tabs)/exercises')
      }
    } catch (err) {
      const originalErrorMsg = mapExerciseError(err)
      setSubmitError(originalErrorMsg)
      if (values.imageId) {
        try {
          await imagesApi.delete(values.imageId)
        } catch {
          setSubmitError(`${originalErrorMsg} (No se pudo limpiar la imagen huérfana).`)
        }
      }
    }
  }

  return (
    <Screen>
      <ExerciseForm
        onSubmit={handleSubmit}
        loading={isPending}
        submitLabel="Create Exercise"
        generalError={submitError || (error ? mapExerciseError(error) : null)}
      />
    </Screen>
  )
}
