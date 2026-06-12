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
import NewExerciseScreen from '../app/(authenticated)/exercises/new'

const mockPost = mobileApiClient.post as jest.Mock

let activeViews: RenderResult[] = []
let activeQueryClients: QueryClient[] = []

async function renderWithQuery(ui: React.ReactNode) {
  const qc = createTestQueryClient()
  activeQueryClients.push(qc)
  const view = await render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
  activeViews.push(view)
  return view
}

describe('Create Exercise Screen', () => {
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

  it('displays validation error when name is empty', async () => {
    const view = await renderWithQuery(<NewExerciseScreen />)
    fireEvent.press(view.getByRole('button', { name: 'Create Exercise' }))

    await waitFor(() => {
      expect(view.getByText(/characters/i)).toBeTruthy()
    })
    view.unmount()
  })

  it('submits successfully with valid input', async () => {
    mockPost.mockResolvedValue({
      data: {
        id: 3,
        name: 'Deadlift',
        type: 'WEIGHT_REPS',
        primaryMuscleGroup: 'LOWER_BACK',
        imageId: null,
      },
    })
    const view = await renderWithQuery(<NewExerciseScreen />)

    const nameInput = view.getByLabelText('Exercise Name')
    fireEvent.changeText(nameInput, 'Deadlift')
    fireEvent.press(view.getByRole('button', { name: 'Create Exercise' }))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/exercise',
        expect.objectContaining({
          name: 'Deadlift',
        }),
      )
      const btn = view.getByRole('button', { name: 'Create Exercise' })
      expect(btn.props.accessibilityState.busy).toBe(false)
      expect(mockReplace).toHaveBeenCalledWith('/(authenticated)/exercises/3')
    })
    view.unmount()
  })
})
