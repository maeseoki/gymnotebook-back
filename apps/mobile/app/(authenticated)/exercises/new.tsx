import { router } from 'expo-router'
import { useState } from 'react'
import { ExerciseForm, type ExerciseFormValues } from '@/features/exercises/components/ExerciseForm'
import { useCreateExerciseMutation } from '@/features/exercises/hooks/use-exercise-mutations'
import { mapExerciseError } from '@/features/exercises/utils/exercise-errors'
import { Screen } from '@/shared/ui/primitives'

export default function NewExerciseScreen() {
  const { mutate, isPending, error } = useCreateExerciseMutation()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = (values: ExerciseFormValues) => {
    setSubmitError(null)
    mutate(values, {
      onSuccess: (data) => {
        if (data && typeof data.id === 'number') {
          router.replace(`/(authenticated)/exercises/${data.id}`)
        } else {
          router.replace('/(authenticated)/(tabs)/exercises')
        }
      },
      onError: (err) => {
        setSubmitError(mapExerciseError(err))
      },
    })
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
