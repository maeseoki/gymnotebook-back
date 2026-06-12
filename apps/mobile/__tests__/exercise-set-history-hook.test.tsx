import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type RenderResult, render, waitFor } from '@testing-library/react-native'
import type React from 'react'
import { Text } from 'react-native'
import { workoutsApi } from '@/features/workout/api/workouts-api'
import { useExerciseSetHistory } from '@/features/workout/hooks/use-exercise-set-history'
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

const mockGetExerciseHistory = workoutsApi.getExerciseHistory as jest.Mock

function TestHookComponent({ exerciseId }: { exerciseId?: number }) {
  const { data, isLoading, isError, error } = useExerciseSetHistory(exerciseId)
  if (isLoading) return <Text testID="loading">Cargando...</Text>
  if (isError) return <Text testID="error">{error?.message}</Text>
  if (!data) return <Text testID="no-data">Sin datos</Text>
  return <Text testID="data">{JSON.stringify(data)}</Text>
}

describe('useExerciseSetHistory Hook and API', () => {
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

  it('calls workoutsApi.getExerciseHistory with correct exerciseId', async () => {
    const mockResponse = {
      content: [],
      totalElements: 0,
      totalPages: 0,
      page: 0,
      pageSize: 20,
    }
    mockGetExerciseHistory.mockResolvedValue(mockResponse)

    const { getByTestId } = await renderWithQuery(
      <QueryClientProvider client={queryClient}>
        <TestHookComponent exerciseId={42} />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(getByTestId('data')).toBeTruthy()
    })

    expect(mockGetExerciseHistory).toHaveBeenCalledWith(42)
  })

  it('does not call workoutsApi.getExerciseHistory when exerciseId is missing or invalid', async () => {
    await renderWithQuery(
      <QueryClientProvider client={queryClient}>
        <TestHookComponent />
      </QueryClientProvider>,
    )

    expect(mockGetExerciseHistory).not.toHaveBeenCalled()
  })

  it('maps/parses response correctly and handles empty response', async () => {
    const mockResponse = {
      content: [],
      totalElements: 0,
      totalPages: 0,
      page: 0,
      pageSize: 20,
    }
    mockGetExerciseHistory.mockResolvedValue(mockResponse)

    const { getByTestId } = await renderWithQuery(
      <QueryClientProvider client={queryClient}>
        <TestHookComponent exerciseId={42} />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(getByTestId('data')).toBeTruthy()
    })

    expect(JSON.parse(getByTestId('data').props.children)).toEqual(mockResponse)
  })

  it('handles API error without throwing globally', async () => {
    mockGetExerciseHistory.mockRejectedValue(new Error('Network failure'))

    const { getByTestId } = await renderWithQuery(
      <QueryClientProvider client={queryClient}>
        <TestHookComponent exerciseId={42} />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(getByTestId('error')).toBeTruthy()
    })

    expect(getByTestId('error').props.children).toBe('Network failure')
  })
})
