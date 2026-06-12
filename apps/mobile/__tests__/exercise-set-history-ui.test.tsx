import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type RenderResult, render, waitFor } from '@testing-library/react-native'
import type React from 'react'
import { workoutsApi } from '@/features/workout/api/workouts-api'
import { SetForm } from '@/features/workout/components/SetForm'
import { createTestQueryClient } from '@/shared/query/client'

// Mock workoutsApi
jest.mock('@/features/workout/api/workouts-api', () => {
  return {
    workoutsApi: {
      getExerciseHistory: jest.fn(),
    },
    WorkoutsApiError: class extends Error {
      constructor(readonly mockFailure: { message?: string }) {
        super(mockFailure.message)
      }
    },
  }
})

// Mock react-native Modal for tests
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const MockModal = ({ children, visible }: { children: React.ReactNode; visible: boolean }) => {
    const { View } = require('react-native')
    if (visible === false) return null
    return <View>{children}</View>
  }
  return {
    __esModule: true,
    default: MockModal,
  }
})

const mockGetExerciseHistory = workoutsApi.getExerciseHistory as jest.Mock

describe('SetForm Exercise History UI', () => {
  let queryClient: QueryClient
  let activeViews: RenderResult[] = []

  async function renderWithQuery(ui: React.ReactElement) {
    const view = await render(ui)
    activeViews.push(view)
    return view
  }

  beforeEach(() => {
    jest.clearAllMocks()
    queryClient = createTestQueryClient()
    activeViews = []
  })

  afterEach(() => {
    for (const view of activeViews) {
      try {
        view.unmount()
      } catch (_e) {}
    }
    activeViews = []
    queryClient.clear()
  })

  const defaultProps = {
    visible: true,
    exerciseType: 'WEIGHT_REPS' as const,
    exerciseName: 'Bench Press',
    exerciseId: 1,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
  }

  it('renders "Últimas series" and loading state initially', async () => {
    mockGetExerciseHistory.mockReturnValue(new Promise(() => {}))

    const { getByText } = await renderWithQuery(
      <QueryClientProvider client={queryClient}>
        <SetForm {...defaultProps} />
      </QueryClientProvider>,
    )

    expect(getByText('Últimas series')).toBeTruthy()
    expect(getByText('Cargando historial...')).toBeTruthy()
  })

  it('renders empty state when no history exists', async () => {
    mockGetExerciseHistory.mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      page: 0,
      pageSize: 20,
    })

    const { getByText, queryByText } = await renderWithQuery(
      <QueryClientProvider client={queryClient}>
        <SetForm {...defaultProps} />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(getByText('Sin historial previo para este ejercicio.')).toBeTruthy()
    })
    expect(queryByText('Cargando historial...')).toBeNull()
  })

  it('renders friendly error state when history query fails', async () => {
    mockGetExerciseHistory.mockRejectedValue(new Error('Network Error'))

    const { getByText, queryByText } = await renderWithQuery(
      <QueryClientProvider client={queryClient}>
        <SetForm {...defaultProps} />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(getByText('No se pudo cargar el historial reciente.')).toBeTruthy()
    })
    expect(queryByText('Network Error')).toBeNull()
  })

  it('renders history values correctly: weight (82500 -> 82.5 kg), drop set, notes', async () => {
    mockGetExerciseHistory.mockResolvedValue({
      content: [
        {
          id: 101,
          startDate: '2026-06-11T12:00:00Z',
          endDate: '2026-06-11T13:00:00Z',
          exercise: { id: 1, name: 'Bench Press', type: 'WEIGHT_REPS' },
          sets: [
            {
              id: 201,
              reps: 8,
              weight: 82500,
              time: 0,
              distance: 0,
              notes: 'Felt heavy',
              isDropSet: true,
            },
            {
              id: 202,
              reps: 10,
              weight: 70000,
              time: 0,
              distance: 0,
              notes: null,
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

    const { getByText } = await renderWithQuery(
      <QueryClientProvider client={queryClient}>
        <SetForm {...defaultProps} />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(getByText(/11/)).toBeTruthy()
    })

    expect(getByText(/Serie 1: 82.5 kg x 8 reps \(Drop\) - Felt heavy/)).toBeTruthy()
    expect(getByText(/Serie 2: 70 kg x 10 reps/)).toBeTruthy()
  })

  it('renders history values correctly for TIME_DISTANCE type', async () => {
    mockGetExerciseHistory.mockResolvedValue({
      content: [
        {
          id: 102,
          startDate: '2026-06-11T12:00:00Z',
          endDate: '2026-06-11T13:00:00Z',
          exercise: { id: 2, name: 'Run', type: 'TIME_DISTANCE' },
          sets: [
            {
              id: 301,
              reps: 0,
              weight: 0,
              time: 90,
              distance: 2000,
              notes: null,
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

    const { getByText } = await renderWithQuery(
      <QueryClientProvider client={queryClient}>
        <SetForm {...defaultProps} exerciseType="TIME_DISTANCE" exerciseName="Run" />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(getByText(/Serie 1: 1m 30s \| 2000 m/)).toBeTruthy()
    })
  })

  it('does not expose unsupported auto progression or suggest next set UI', async () => {
    mockGetExerciseHistory.mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      page: 0,
      pageSize: 20,
    })

    const { queryByText } = await renderWithQuery(
      <QueryClientProvider client={queryClient}>
        <SetForm {...defaultProps} />
      </QueryClientProvider>,
    )

    expect(queryByText(/sugerencia/i)).toBeNull()
    expect(queryByText(/auto/i)).toBeNull()
    expect(queryByText(/siguiente/i)).toBeNull()
    expect(queryByText(/progression/i)).toBeNull()
  })
})
