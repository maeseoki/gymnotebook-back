import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type RenderResult, render, waitFor } from '@testing-library/react-native'
import type React from 'react'
import { mobileApiClient } from '@/features/auth/api/mobile-auth-api'
import { workoutsApi } from '@/features/workout/api/workouts-api'
import { createTestQueryClient } from '@/shared/query/client'
import ExerciseDetailScreen from '../app/(authenticated)/exercises/[id]/index'

// Mock expo-router
const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockUseLocalSearchParams = jest.fn()

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}))

// Mock workoutsApi
jest.mock('@/features/workout/api/workouts-api', () => {
  return {
    workoutsApi: {
      getExerciseHistory: jest.fn(),
    },
    WorkoutsApiError: class extends Error {
      constructor(readonly mockFailure: { message?: string }) {
        super(mockFailure?.message)
      }
    },
  }
})

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

const mockGetExerciseHistory = workoutsApi.getExerciseHistory as jest.Mock
const mockGet = mobileApiClient.get as jest.Mock

const mockExerciseWeightReps = {
  id: 1,
  name: 'Bench Press',
  description: 'Chest movement',
  type: 'WEIGHT_REPS',
  primaryMuscleGroup: 'CHEST',
  secondaryMuscleGroup: null,
  imageId: null,
}

const mockExerciseTimeDistance = {
  id: 2,
  name: 'Running',
  description: 'Cardio',
  type: 'TIME_DISTANCE',
  primaryMuscleGroup: 'CARDIO',
  secondaryMuscleGroup: null,
  imageId: null,
}

describe('Exercise Detail Screen Stats Card integration', () => {
  let queryClient: QueryClient
  type TestRenderResult = Awaited<ReturnType<typeof render>>

  let activeViews: TestRenderResult[] = []

  async function renderWithQuery(ui: React.ReactElement): Promise<TestRenderResult> {
    const view = await render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
    activeViews.push(view)
    return view
  }

  beforeEach(() => {
    jest.clearAllMocks()
    queryClient = createTestQueryClient()
    activeViews = []
    mockUseLocalSearchParams.mockReturnValue({ id: '1' })
  })

  afterEach(async () => {
    await queryClient.cancelQueries()

    for (const view of activeViews) {
      try {
        await view.unmount()
      } catch (_e) {}
    }

    activeViews = []
    queryClient.clear()
  })

  it('renders "Estadísticas" and loading state initially, then details and empty stats state when no history exists', async () => {
    mockGet.mockResolvedValue({ data: mockExerciseWeightReps })

    // Stub history to return a pending promise to test loading state
    let resolveHistory!: (value: unknown) => void
    mockGetExerciseHistory.mockReturnValue(
      new Promise((resolve) => {
        resolveHistory = resolve
      }),
    )

    const view = await renderWithQuery(<ExerciseDetailScreen />)

    // Verify main info is loading or details render
    await waitFor(() => {
      expect(view.getByText('Bench Press')).toBeTruthy()
    })

    // Verify stats loading state
    expect(view.getByText('Estadísticas')).toBeTruthy()
    expect(view.getByText('Cargando estadísticas...')).toBeTruthy()

    // Resolve as empty history
    resolveHistory({
      content: [],
      totalElements: 0,
      totalPages: 0,
      page: 0,
      pageSize: 20,
    })

    // Verify empty stats state
    await waitFor(() => {
      expect(view.getByText('Aún no hay estadísticas para este ejercicio.')).toBeTruthy()
    })
  })

  it('handles history fetch error gracefully, showing friendly message without breaking the screen', async () => {
    mockGet.mockResolvedValue({ data: mockExerciseWeightReps })
    mockGetExerciseHistory.mockRejectedValue(new Error('API Failure'))

    const view = await renderWithQuery(<ExerciseDetailScreen />)

    await waitFor(() => {
      expect(view.getByText('Bench Press')).toBeTruthy()
      expect(view.getByText('Estadísticas')).toBeTruthy()
      expect(view.getByText('No se pudieron cargar las estadísticas.')).toBeTruthy()
    })
  })

  it('renders correct stats for WEIGHT_REPS exercise history (weight conversion 82500 -> 82.5 kg, correct total series count and best volume)', async () => {
    mockGet.mockResolvedValue({ data: mockExerciseWeightReps })
    mockGetExerciseHistory.mockResolvedValue({
      content: [
        {
          id: 101,
          startDate: '2026-06-11T12:00:00Z',
          endDate: '2026-06-11T13:00:00Z',
          exercise: {
            id: 1,
            name: 'Bench Press',
            type: 'WEIGHT_REPS',
            primaryMuscleGroup: 'CHEST',
          },
          sets: [
            {
              id: 201,
              reps: 8,
              weight: 82500, // 82.5 kg
              time: 0,
              distance: 0,
              isDropSet: false,
            },
            {
              id: 202,
              reps: 10,
              weight: 70000, // 70 kg
              time: 0,
              distance: 0,
              isDropSet: false,
            },
          ],
        },
      ],
      totalElements: 1,
      totalPages: 1,
      page: 0,
      pageSize: 20,
    })

    const view = await renderWithQuery(<ExerciseDetailScreen />)

    await waitFor(() => {
      expect(view.getByText('Bench Press')).toBeTruthy()
      expect(view.getByText('Estadísticas')).toBeTruthy()
    })

    // Assert stats contents
    expect(view.getByText(/Última vez:/)).toBeTruthy()
    expect(view.getByText(/Total de series: 2/)).toBeTruthy()
    expect(view.getByText(/Mejor peso: 82.5 kg/)).toBeTruthy()
    expect(view.getByText(/Mejor volumen: 700 kg/)).toBeTruthy() // 70 * 10 = 700 kg
  })

  it('renders correct stats for TIME_DISTANCE exercise history (best time and distance displayed)', async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: '2' })
    mockGet.mockResolvedValue({ data: mockExerciseTimeDistance })
    mockGetExerciseHistory.mockResolvedValue({
      content: [
        {
          id: 102,
          startDate: '2026-06-12T15:00:00Z',
          endDate: '2026-06-12T16:00:00Z',
          exercise: { id: 2, name: 'Running', type: 'TIME_DISTANCE', primaryMuscleGroup: 'CARDIO' },
          sets: [
            {
              id: 301,
              reps: 0,
              weight: 0,
              time: 90, // 1m 30s
              distance: 2000,
              isDropSet: false,
            },
          ],
        },
      ],
      totalElements: 1,
      totalPages: 1,
      page: 0,
      pageSize: 20,
    })

    const view = await renderWithQuery(<ExerciseDetailScreen />)

    await waitFor(() => {
      expect(view.getByText('Running')).toBeTruthy()
      expect(view.getByText('Estadísticas')).toBeTruthy()
    })

    // Assert stats contents
    expect(view.getByText(/Última vez:/)).toBeTruthy()
    expect(view.getByText(/Total de series: 1/)).toBeTruthy()
    expect(view.getByText(/Mejor tiempo: 1m 30s/)).toBeTruthy()
    expect(view.getByText(/Mejor distancia: 2000 m/)).toBeTruthy()

    // Assert that no other endpoints or calls were made except details and history endpoint
    expect(mockGetExerciseHistory).toHaveBeenCalledTimes(1)
    expect(mockGetExerciseHistory).toHaveBeenCalledWith(2)
  })
})
