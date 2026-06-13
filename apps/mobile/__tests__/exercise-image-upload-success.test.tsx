import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native'
import { ExerciseForm } from '@/features/exercises/components/ExerciseForm'

const mockRequestMediaLibraryPermissionsAsync = jest.fn()
const mockLaunchImageLibraryAsync = jest.fn()

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: () => mockRequestMediaLibraryPermissionsAsync(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
  },
}))

const mockUploadImage = jest.fn()

jest.mock('@/features/images/hooks/use-upload-image', () => ({
  useUploadImage: () => ({
    mutate: mockUploadImage,
    isPending: false,
  }),
}))

describe('exercise image upload success', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file://gallery.jpg',
          fileName: 'gallery.jpg',
          mimeType: 'image/jpeg',
        },
      ],
    })
  })

  afterEach(async () => {
    cleanup()
  })

  it('stores the returned imageId and submits it with form values', async () => {
    mockUploadImage.mockImplementation((_params, options) => {
      options?.onSuccess?.({ id: 100 })
    })
    const onSubmit = jest.fn()
    const view = await render(<ExerciseForm onSubmit={onSubmit} submitLabel="Create Exercise" />)

    fireEvent.press(view.getByLabelText('Elegir de galería'))
    await waitFor(() => {
      expect(mockUploadImage).toHaveBeenCalled()
    })
    fireEvent.changeText(view.getByLabelText('Nombre del ejercicio'), 'Squat')
    fireEvent.press(view.getByLabelText('Create Exercise'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Squat',
          imageId: 100,
        }),
      )
    })
  })
})
