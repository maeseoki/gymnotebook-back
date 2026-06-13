import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native'
import { ExerciseForm, type ExerciseFormValues } from '@/features/exercises/components/ExerciseForm'

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
  },
}))

jest.mock('@/features/images/hooks/use-upload-image', () => ({
  useUploadImage: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}))

const validFormValues = (imageId: number | null): ExerciseFormValues => ({
  name: 'Bench Press',
  description: null,
  type: 'WEIGHT_REPS',
  primaryMuscleGroup: 'CHEST',
  secondaryMuscleGroup: null,
  imageId,
})

describe('exercise image removal', () => {
  afterEach(() => {
    cleanup()
  })

  it('removes an existing image by submitting imageId null', async () => {
    const onSubmit = jest.fn()
    const view = await render(
      <ExerciseForm
        initialValues={validFormValues(123)}
        onSubmit={onSubmit}
        submitLabel="Save Changes"
      />,
    )

    fireEvent.press(view.getByLabelText('Quitar imagen'))
    fireEvent.press(view.getByLabelText('Save Changes'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          imageId: null,
        }),
      )
    })
  })
})
