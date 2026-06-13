import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, type RenderResult, render, waitFor } from '@testing-library/react-native'
import type React from 'react'
import { Alert, type AlertButton } from 'react-native'

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
import ExerciseDetailScreen from '../app/(authenticated)/exercises/[id]/index'

const mockGet = mobileApiClient.get as jest.Mock
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

let activeViews: RenderResult[] = []
let activeQueryClients: QueryClient[] = []

async function renderWithQuery(ui: React.ReactNode) {
  const qc = createTestQueryClient()
  activeQueryClients.push(qc)
  const view = await render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
  activeViews.push(view)
  return view
}

describe('Exercise Detail Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Alert, 'alert')
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

  it('validates ID and displays detail info', async () => {
    mockGet.mockResolvedValue({ data: mockExercise1 })
    const view = await renderWithQuery(<ExerciseDetailScreen />)

    await waitFor(() => {
      expect(view.getByText('Bench Press')).toBeTruthy()
      expect(view.getAllByText(/pecho/i).length).toBeGreaterThan(0)
      expect(view.getAllByText(/tríceps/i).length).toBeGreaterThan(0)
      expect(view.getByText('Chest movement')).toBeTruthy()
    })
    view.unmount()
  })

  it('shows error if route ID is invalid', async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: 'abc' })
    const view = await renderWithQuery(<ExerciseDetailScreen />)
    expect(view.getByText('ID de ejercicio no válido')).toBeTruthy()
    view.unmount()
  })

  it('handles delete action with confirmation', async () => {
    mockGet.mockResolvedValue({ data: mockExercise1 })
    mockDelete.mockResolvedValue({ status: 204 })

    const view = await renderWithQuery(<ExerciseDetailScreen />)

    await waitFor(() => {
      expect(view.getByText('Bench Press')).toBeTruthy()
    })

    fireEvent.press(view.getByRole('button', { name: 'Eliminar ejercicio' }))

    const alertSpy = Alert.alert as jest.Mock
    expect(alertSpy).toHaveBeenCalled()

    const deleteBtn = alertSpy.mock.calls[0][2]?.find((b: AlertButton) => b.text === 'Eliminar')
    expect(deleteBtn).toBeTruthy()

    if (deleteBtn?.onPress) {
      deleteBtn.onPress()
    }

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('/exercise/1')
      expect(mockReplace).toHaveBeenCalledWith('/(authenticated)/(tabs)/exercises')
    })
    view.unmount()
  })
})
