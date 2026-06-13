import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native'

const mockRequestMediaLibraryPermissionsAsync = jest.fn()
const mockRequestCameraPermissionsAsync = jest.fn()
const mockLaunchImageLibraryAsync = jest.fn()
const mockLaunchCameraAsync = jest.fn()

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: () => mockRequestMediaLibraryPermissionsAsync(),
  requestCameraPermissionsAsync: () => mockRequestCameraPermissionsAsync(),
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
  launchCameraAsync: (...args: unknown[]) => mockLaunchCameraAsync(...args),
  MediaTypeOptions: {
    Images: 'Images',
  },
}))

jest.mock('@/features/auth/api/mobile-auth-api', () => ({
  mobileApiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}))

const mockUploadImage = jest.fn()

jest.mock('@/features/images/hooks/use-upload-image', () => ({
  useUploadImage: () => ({
    mutate: mockUploadImage,
    isPending: false,
  }),
}))

import { mobileApiClient } from '@/features/auth/api/mobile-auth-api'
import { ExerciseForm } from '@/features/exercises/components/ExerciseForm'
import { ImagesApiError, imagesApi } from '@/features/images/api/images-api'

const mockPost = mobileApiClient.post as jest.Mock
const mockDelete = mobileApiClient.delete as jest.Mock

async function pressAndFlush(element: Parameters<typeof fireEvent.press>[0]) {
  await act(async () => {
    fireEvent.press(element)
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('exercise image upload', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mockRequestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: [] })
    mockLaunchCameraAsync.mockResolvedValue({ canceled: true, assets: [] })
    mockPost.mockResolvedValue({ data: { id: 42 } })
    mockDelete.mockResolvedValue({ data: null })
  })

  afterEach(() => {
    cleanup()
  })

  describe('imagesApi', () => {
    it('uploads an image to /image with multipart FormData and parses the returned id', async () => {
      mockPost.mockResolvedValueOnce({ data: { id: 42 } })

      const result = await imagesApi.upload('file://photo.jpg', 'photo.jpg', 'image/jpeg')

      expect(mockPost).toHaveBeenCalledWith(
        '/image',
        expect.any(FormData),
        expect.objectContaining({
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }),
      )
      expect(result).toEqual({ id: 42 })
    })

    it('normalizes upload errors', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network error'))

      await expect(imagesApi.upload('file://photo.jpg')).rejects.toBeInstanceOf(ImagesApiError)
    })

    it('deletes images through /image/:id', async () => {
      await imagesApi.delete(123)

      expect(mockDelete).toHaveBeenCalledWith('/image/123')
    })
  })

  describe('ExerciseForm', () => {
    it('renders gallery and camera controls', async () => {
      const onSubmit = jest.fn()

      const view = await render(<ExerciseForm onSubmit={onSubmit} submitLabel="Create Exercise" />)

      expect(view.getByLabelText('Elegir de galería')).toBeTruthy()
      expect(view.getByLabelText('Sacar foto')).toBeTruthy()
    })

    it('shows a gallery permission error', async () => {
      mockRequestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ status: 'denied' })
      const view = await render(<ExerciseForm onSubmit={jest.fn()} submitLabel="Create Exercise" />)

      await pressAndFlush(view.getByLabelText('Elegir de galería'))

      expect(await view.findByText('No se pudo acceder a la galería.')).toBeTruthy()
      expect(mockUploadImage).not.toHaveBeenCalled()
    })

    it('shows a camera permission error', async () => {
      mockRequestCameraPermissionsAsync.mockResolvedValueOnce({ status: 'denied' })
      const view = await render(<ExerciseForm onSubmit={jest.fn()} submitLabel="Create Exercise" />)

      await pressAndFlush(view.getByLabelText('Sacar foto'))

      expect(await view.findByText('No se pudo acceder a la cámara.')).toBeTruthy()
      expect(mockUploadImage).not.toHaveBeenCalled()
    })

    it('does not upload when gallery selection is canceled', async () => {
      mockLaunchImageLibraryAsync.mockResolvedValueOnce({ canceled: true, assets: [] })
      const view = await render(<ExerciseForm onSubmit={jest.fn()} submitLabel="Create Exercise" />)

      await pressAndFlush(view.getByLabelText('Elegir de galería'))

      await waitFor(() => {
        expect(mockLaunchImageLibraryAsync).toHaveBeenCalled()
      })
      expect(mockUploadImage).not.toHaveBeenCalled()
    })

    it('uploads selected gallery assets with URI, filename, and mime type', async () => {
      mockLaunchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            uri: 'file://gallery.jpg',
            fileName: 'gallery.jpg',
            mimeType: 'image/jpeg',
          },
        ],
      })
      const view = await render(<ExerciseForm onSubmit={jest.fn()} submitLabel="Create Exercise" />)

      await pressAndFlush(view.getByLabelText('Elegir de galería'))

      await waitFor(() => {
        expect(mockUploadImage).toHaveBeenCalledWith(
          { uri: 'file://gallery.jpg', filename: 'gallery.jpg', mimeType: 'image/jpeg' },
          expect.objectContaining({
            onSuccess: expect.any(Function),
            onError: expect.any(Function),
          }),
        )
      })
    })

    it('shows upload failures and keeps the form usable', async () => {
      mockLaunchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://gallery.jpg' }],
      })
      mockUploadImage.mockImplementation((_params, options) => {
        options?.onError?.(new Error('Upload failed'))
      })
      const onSubmit = jest.fn()
      const view = await render(<ExerciseForm onSubmit={onSubmit} submitLabel="Create Exercise" />)

      await pressAndFlush(view.getByLabelText('Elegir de galería'))

      expect(await view.findByText('No se pudo subir la imagen.')).toBeTruthy()

      fireEvent.changeText(view.getByLabelText('Exercise Name'), 'Pullup')
      fireEvent.press(view.getByLabelText('Create Exercise'))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Pullup',
            imageId: null,
          }),
        )
      })
    })
  })
})
