import { act, cleanup, render, waitFor } from '@testing-library/react-native'
import type { ExerciseFormValues } from '@/features/exercises/components/ExerciseForm'

const mockReplace = jest.fn()
const mockUseLocalSearchParams = jest.fn()

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
  },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}))

const mockUseExerciseDetail = jest.fn()
const mockCreateExercise = jest.fn()
const mockUpdateExercise = jest.fn()
const mockDeleteExercise = jest.fn()

jest.mock('@/features/exercises/hooks/use-exercise-detail', () => ({
  useExerciseDetail: (id: number) => mockUseExerciseDetail(id),
}))

jest.mock('@/features/exercises/hooks/use-exercise-mutations', () => ({
  useCreateExerciseMutation: () => ({
    mutateAsync: mockCreateExercise,
    isPending: false,
    error: null,
  }),
  useUpdateExerciseMutation: (id: number) => ({
    mutateAsync: (values: ExerciseFormValues) => mockUpdateExercise(id, values),
    isPending: false,
    error: null,
  }),
  useDeleteExerciseMutation: () => ({
    mutate: mockDeleteExercise,
    isPending: false,
  }),
}))

const mockDeleteImage = jest.fn()

jest.mock('@/features/images/api/images-api', () => ({
  imagesApi: {
    delete: (id: number) => mockDeleteImage(id),
  },
}))

let mockSubmittedValues: ExerciseFormValues
const mockExerciseFormProps = jest.fn()

jest.mock('@/features/exercises/components/ExerciseForm', () => {
  return {
    ExerciseForm: (props: {
      initialValues?: Partial<ExerciseFormValues>
      onSubmit: (values: ExerciseFormValues) => void | Promise<void>
    }) => {
      mockExerciseFormProps(props)
      return null
    },
  }
})

import ExerciseEditScreen from '../app/(authenticated)/exercises/[id]/edit'
import NewExerciseScreen from '../app/(authenticated)/exercises/new'

const exerciseWithImage = {
  id: 1,
  name: 'Bench Press',
  description: 'Chest movement',
  type: 'WEIGHT_REPS' as const,
  primaryMuscleGroup: 'CHEST' as const,
  secondaryMuscleGroup: null,
  imageId: 123,
}

const validFormValues = (imageId: number | null): ExerciseFormValues => ({
  name: 'Bench Press',
  description: null,
  type: 'WEIGHT_REPS',
  primaryMuscleGroup: 'CHEST',
  secondaryMuscleGroup: null,
  imageId,
})

describe('exercise image page wiring', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockUseLocalSearchParams.mockReturnValue({ id: '1' })
    mockUseExerciseDetail.mockReturnValue({
      data: exerciseWithImage,
      isLoading: false,
      error: null,
    })
    mockCreateExercise.mockResolvedValue({ ...exerciseWithImage, id: 2 })
    mockUpdateExercise.mockResolvedValue(exerciseWithImage)
    mockDeleteImage.mockResolvedValue(undefined)
    mockSubmittedValues = validFormValues(321)
  })

  afterEach(() => {
    cleanup()
  })

  it('new screen forwards submitted imageId to the create mutation', async () => {
    mockSubmittedValues = validFormValues(321)

    await render(<NewExerciseScreen />)
    await act(async () => {
      await mockExerciseFormProps.mock.calls[0][0].onSubmit(mockSubmittedValues)
    })

    await waitFor(() => {
      expect(mockCreateExercise).toHaveBeenCalledWith(expect.objectContaining({ imageId: 321 }))
      expect(mockReplace).toHaveBeenCalledWith('/(authenticated)/exercises/2')
    })
  })

  it('edit screen passes initial imageId to the form', async () => {
    await render(<ExerciseEditScreen />)

    await waitFor(() => {
      expect(mockExerciseFormProps).toHaveBeenCalledWith(
        expect.objectContaining({
          initialValues: expect.objectContaining({ imageId: 123 }),
        }),
      )
    })
  })

  it('edit submit sends a changed imageId and deletes the old image after success', async () => {
    mockSubmittedValues = validFormValues(456)

    await render(<ExerciseEditScreen />)
    await act(async () => {
      await mockExerciseFormProps.mock.calls[0][0].onSubmit(mockSubmittedValues)
    })

    await waitFor(() => {
      expect(mockUpdateExercise).toHaveBeenCalledWith(1, expect.objectContaining({ imageId: 456 }))
      expect(mockDeleteImage).toHaveBeenCalledWith(123)
      expect(mockReplace).toHaveBeenCalledWith('/(authenticated)/exercises/1')
    })
  })

  it('edit submit sends imageId null and deletes the old image after success', async () => {
    mockSubmittedValues = validFormValues(null)

    await render(<ExerciseEditScreen />)
    await act(async () => {
      await mockExerciseFormProps.mock.calls[0][0].onSubmit(mockSubmittedValues)
    })

    await waitFor(() => {
      expect(mockUpdateExercise).toHaveBeenCalledWith(1, expect.objectContaining({ imageId: null }))
      expect(mockDeleteImage).toHaveBeenCalledWith(123)
    })
  })

  it('does not delete the old image when edit fails', async () => {
    mockSubmittedValues = validFormValues(456)
    mockUpdateExercise.mockRejectedValueOnce(new Error('Update failed'))

    await render(<ExerciseEditScreen />)
    await act(async () => {
      await mockExerciseFormProps.mock.calls[0][0].onSubmit(mockSubmittedValues)
    })

    await waitFor(() => {
      expect(mockUpdateExercise).toHaveBeenCalled()
    })
    expect(mockDeleteImage).not.toHaveBeenCalledWith(123)
  })
})
