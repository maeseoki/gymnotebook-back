import axios, { AxiosError } from 'axios'

// Mock mobileApiClient
jest.mock('@/features/auth/api/mobile-auth-api', () => {
  const original = jest.requireActual('@/features/auth/api/mobile-auth-api')
  return {
    ...original,
    mobileApiClient: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    },
  }
})

import { mobileApiClient } from '@/features/auth/api/mobile-auth-api'
import { ExercisesApiError, exercisesApi } from '@/features/exercises/api/exercises-api'
import { mapExerciseError } from '@/features/exercises/utils/exercise-errors'

const mockGet = mobileApiClient.get as jest.Mock
const mockPost = mobileApiClient.post as jest.Mock
const mockPut = mobileApiClient.put as jest.Mock
const mockDelete = mobileApiClient.delete as jest.Mock

const mockExercise1 = {
  id: 1,
  name: 'Bench Press',
  description: 'Chest movement',
  type: 'WEIGHT_REPS',
  primaryMuscleGroup: 'CHEST',
  secondaryMuscleGroup: 'TRICEPS',
  imageId: null,
}

const mockExercise2 = {
  id: 2,
  name: 'Squat',
  description: 'Leg movement',
  type: 'WEIGHT_REPS',
  primaryMuscleGroup: 'QUADRICEPS',
  secondaryMuscleGroup: 'GLUTES',
  imageId: null,
}

describe('Exercises API Layer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fetches list of exercises and validates Zod contract', async () => {
    mockGet.mockResolvedValueOnce({ data: [mockExercise1, mockExercise2] })
    const list = await exercisesApi.list()
    expect(list).toHaveLength(2)
    expect(list[0]).toEqual(mockExercise1)
    expect(mockGet).toHaveBeenCalledWith('/exercise')
  })

  it('fetches single exercise and validates Zod contract', async () => {
    mockGet.mockResolvedValueOnce({ data: mockExercise1 })
    const exercise = await exercisesApi.get(1)
    expect(exercise).toEqual(mockExercise1)
    expect(mockGet).toHaveBeenCalledWith('/exercise/1')
  })

  it('creates exercise and validates Zod contract', async () => {
    const payload = {
      name: 'Deadlift',
      description: 'Back movement',
      type: 'WEIGHT_REPS' as const,
      primaryMuscleGroup: 'LOWER_BACK' as const,
      secondaryMuscleGroup: 'GLUTES' as const,
      imageId: null,
    }
    mockPost.mockResolvedValueOnce({ data: { id: 3, ...payload } })
    const created = await exercisesApi.create(payload)
    expect(created.id).toBe(3)
    expect(mockPost).toHaveBeenCalledWith('/exercise', payload)
  })

  it('updates exercise and validates Zod contract', async () => {
    const payload = {
      name: 'Incline Bench Press',
      description: 'Upper chest movement',
      type: 'WEIGHT_REPS' as const,
      primaryMuscleGroup: 'CHEST' as const,
      secondaryMuscleGroup: 'SHOULDERS' as const,
      imageId: null,
    }
    mockPut.mockResolvedValueOnce({ data: { id: 1, ...payload } })
    const updated = await exercisesApi.update(1, payload)
    expect(updated.name).toBe('Incline Bench Press')
    expect(mockPut).toHaveBeenCalledWith('/exercise/1', payload)
  })

  it('deletes exercise', async () => {
    mockDelete.mockResolvedValueOnce({ status: 204 })
    await exercisesApi.delete(1)
    expect(mockDelete).toHaveBeenCalledWith('/exercise/1')
  })

  it('normalizes Axios error to ExercisesApiError', async () => {
    const axiosError = new AxiosError('unauthorized', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
      data: {
        statusCode: 401,
        code: 'unauthorized',
        message: 'Session invalid',
      },
    })
    mockGet.mockRejectedValueOnce(axiosError)
    await expect(exercisesApi.list()).rejects.toThrow(ExercisesApiError)
  })
})

describe('Error Mapping', () => {
  it('maps backend 401 to session expired', () => {
    const apiError = new ExercisesApiError({
      kind: 'backend',
      status: 401,
      code: 'unauthorized',
      message: 'Expired',
    })
    expect(mapExerciseError(apiError)).toContain('Session expired')
  })

  it('maps backend 404 to exercise not found', () => {
    const apiError = new ExercisesApiError({
      kind: 'backend',
      status: 404,
      code: 'not_found',
      message: 'Not Found',
    })
    expect(mapExerciseError(apiError)).toContain('Exercise not found')
  })

  it('maps network unavailable to connection error', () => {
    const apiError = new ExercisesApiError({
      kind: 'network_unavailable',
      message: 'Network is down',
    })
    expect(mapExerciseError(apiError)).toContain('Connection problem')
  })
})
