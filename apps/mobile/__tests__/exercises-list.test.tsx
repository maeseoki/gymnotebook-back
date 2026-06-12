import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, type RenderResult, render, waitFor } from '@testing-library/react-native'
import { AxiosError } from 'axios'
import type React from 'react'

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
import { createTestQueryClient } from '@/shared/query/client'
import ExercisesScreen from '../app/(authenticated)/(tabs)/exercises'

const mockGet = mobileApiClient.get as jest.Mock

const mockExercise1 = {
  id: 1,
  name: 'Bench Press',
  description: 'Chest movement',
  type: 'WEIGHT_REPS',
  primaryMuscleGroup: 'CHEST',
  secondaryMuscleGroup: 'TRICEPS',
  imageId: null,
}

let activeViews: RenderResult[] = []
let activeQueryClients: QueryClient[] = []

async function renderWithQuery(ui: React.ReactNode) {
  const qc = createTestQueryClient()
  activeQueryClients.push(qc)
  const view = await render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
  activeViews.push(view)
  return view
}

describe('Exercises List Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseLocalSearchParams.mockReturnValue({ id: '1' })
    activeViews = []
    activeQueryClients = []
  })

  afterEach(async () => {
    for (const view of activeViews) {
      try {
        view.unmount()
      } catch (_e) {}
    }
    for (const qc of activeQueryClients) {
      qc.clear()
    }
    activeQueryClients = []
    activeViews = []
    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  it('renders loader, error state, and lists cards upon success', async () => {
    mockGet.mockResolvedValue({ data: [mockExercise1] })
    const view = await renderWithQuery(<ExercisesScreen />)

    await waitFor(() => {
      expect(view.getByText('Bench Press')).toBeTruthy()
    })
    expect(view.queryByLabelText('Loading exercises')).toBeNull()
    view.unmount()
  })

  it('renders empty state when list is empty', async () => {
    mockGet.mockResolvedValue({ data: [] })
    const view = await renderWithQuery(<ExercisesScreen />)

    await waitFor(() => {
      expect(view.getByText('No exercises found. Add your first exercise!')).toBeTruthy()
    })
    view.unmount()
  })

  it('renders error state on API failure', async () => {
    const axiosError = new AxiosError('Network Error')
    mockGet.mockRejectedValue(axiosError)
    const view = await renderWithQuery(<ExercisesScreen />)

    await waitFor(() => {
      expect(
        view.getByText('Connection problem. Please check your internet connection.'),
      ).toBeTruthy()
    })
    view.unmount()
  })

  it('filters exercises by name and description and handles empty search results', async () => {
    const mockExercise2 = {
      id: 2,
      name: 'Squat',
      description: 'Leg movement',
      type: 'WEIGHT_REPS',
      primaryMuscleGroup: 'QUADRICEPS',
      secondaryMuscleGroup: 'HAMSTRINGS',
      imageId: null,
    }
    mockGet.mockResolvedValue({ data: [mockExercise1, mockExercise2] })
    const view = await renderWithQuery(<ExercisesScreen />)

    // Wait for the exercises to load and be visible
    await waitFor(() => {
      expect(view.getByText('Bench Press')).toBeTruthy()
      expect(view.getByText('Squat')).toBeTruthy()
    })

    const searchInput = view.getByPlaceholderText('Search exercises...')
    expect(searchInput).toBeTruthy()

    // Filter by name "squat"
    fireEvent.changeText(searchInput, 'squat')
    await waitFor(() => {
      expect(view.queryByText('Squat')).toBeTruthy()
      expect(view.queryByText('Bench Press')).toBeNull()
    })

    // Filter by description "Chest"
    fireEvent.changeText(searchInput, 'Chest')
    await waitFor(() => {
      expect(view.queryByText('Bench Press')).toBeTruthy()
      expect(view.queryByText('Squat')).toBeNull()
    })

    // Filter by query matching nothing
    fireEvent.changeText(searchInput, 'Deadlift')
    await waitFor(() => {
      expect(view.queryByText('Bench Press')).toBeNull()
      expect(view.queryByText('Squat')).toBeNull()
      expect(view.queryByText('No exercises match your search query.')).toBeTruthy()
    })

    // Clear search and confirm both are back
    fireEvent.changeText(searchInput, '')
    await waitFor(() => {
      expect(view.queryByText('Bench Press')).toBeTruthy()
      expect(view.queryByText('Squat')).toBeTruthy()
    })

    view.unmount()
  })
})
