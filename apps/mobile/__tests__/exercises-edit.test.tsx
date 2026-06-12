import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, type RenderResult, render, waitFor } from '@testing-library/react-native'
import type React from 'react'
import type { z } from 'zod'

// Mock @hookform/resolvers/zod to run validation synchronously in tests
jest.mock('@hookform/resolvers/zod', () => ({
  zodResolver: (schema: z.ZodSchema) => (values: unknown) => {
    const result = schema.safeParse(values)
    if (result.success) {
      return { values: result.data, errors: {} }
    }
    const errors: Record<string, { type: string; message: string }> = {}
    for (const issue of result.error.issues) {
      const path = issue.path.join('.')
      errors[path] = {
        type: issue.code,
        message: issue.message,
      }
    }
    return { values: {}, errors }
  },
}))

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
import ExerciseEditScreen from '../app/(authenticated)/exercises/[id]/edit'

const mockGet = mobileApiClient.get as jest.Mock
const mockPut = mobileApiClient.put as jest.Mock

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

describe('Exercise Edit Screen', () => {
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

  it('prefills and submits edited values', async () => {
    mockGet.mockResolvedValue({ data: mockExercise1 })
    mockPut.mockResolvedValue({ data: { ...mockExercise1, name: 'Heavy Bench Press' } })

    const view = await renderWithQuery(<ExerciseEditScreen />)

    await waitFor(() => {
      expect(view.getByLabelText('Exercise Name').props.value).toBe('Bench Press')
    })

    const nameInput = view.getByLabelText('Exercise Name')
    fireEvent.changeText(nameInput, 'Heavy Bench Press')

    fireEvent.press(view.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        '/exercise/1',
        expect.objectContaining({
          name: 'Heavy Bench Press',
        }),
      )
    })
    view.unmount()
  })
})
