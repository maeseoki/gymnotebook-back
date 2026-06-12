import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import type React from 'react'
import { Alert, type AlertButton } from 'react-native'
import { activeWorkoutStorage } from '@/features/workout/persistence/active-workout-storage'
import { ActiveWorkoutDraftSchema } from '@/features/workout/schemas/active-workout-draft'
import { useWorkoutStore } from '@/features/workout/store/workout-store'
import { createTestQueryClient } from '@/shared/query/client'
import WorkoutScreen from '../app/(authenticated)/(tabs)/workout'

// Mock expo-router
const mockReplace = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}))

// Mock API Client
jest.mock('@/features/auth/api/mobile-auth-api', () => ({
  mobileApiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}))

const mockUseExercises = jest.fn(() => ({
  data: [] as unknown[],
  isLoading: false,
  isError: false,
  error: null as Error | null,
}))
jest.mock('@/features/exercises/hooks/use-exercises', () => ({
  useExercises: () => mockUseExercises(),
}))
jest.mock('../src/features/exercises/hooks/use-exercises', () => ({
  useExercises: () => mockUseExercises(),
}))

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

// Isolated in-memory storage mock to prevent race conditions
let mockStorageData: Record<string, string> = {}

jest.mock('@/shared/storage/async-storage', () => {
  const original = jest.requireActual('@/shared/storage/async-storage')
  return {
    ...original,
    createAsyncStorageAdapter: () => ({
      getItem: async (key: string) => mockStorageData[key] ?? null,
      setItem: async (key: string, value: string) => {
        mockStorageData[key] = value
      },
      removeItem: async (key: string) => {
        delete mockStorageData[key]
      },
    }),
  }
})

describe('Active Workout Resume UX', () => {
  const queryClient = createTestQueryClient()
  let alertSpy: jest.SpyInstance
  let activeViews: Array<Awaited<ReturnType<typeof render>>> = []

  beforeEach(async () => {
    jest.clearAllMocks()
    mockStorageData = {}
    queryClient.clear()
    useWorkoutStore.setState({
      draft: null,
      isLoading: false,
      isCorrupted: false,
      corruptedRaw: '',
      error: null,
    })

    // Default Alert spy
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      // Auto-confirm by default
      const confirmButton = buttons?.find((b: AlertButton) => b.text === 'Confirmar')
      if (confirmButton?.onPress) {
        confirmButton.onPress()
      }
    })
  })

  afterEach(async () => {
    alertSpy.mockRestore()
    for (const v of activeViews) {
      try {
        v.unmount()
      } catch (_e) {}
    }
    activeViews = []
    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  // 1. Persisted draft summary is shown when draft exists
  it('shows the resume summary screen when a draft is restored/exists', async () => {
    const testDraft = {
      version: 1 as const,
      id: 'd3b07384-d113-4ec5-a5ae-be8e3ad5d35a',
      startedAt: '2026-06-12T10:00:00.000Z',
      updatedAt: '2026-06-12T10:05:00.000Z',
      exercises: [
        {
          draftExerciseId: 'exercise_1',
          exerciseId: 55,
          exerciseName: 'Squat',
          exerciseType: 'WEIGHT_REPS' as const,
          sets: [
            {
              draftSetId: 'set_1',
              weightGrams: 80000,
              reps: 8,
              createdAt: '2026-06-12T10:01:00.000Z',
              updatedAt: '2026-06-12T10:01:00.000Z',
            },
          ],
        },
      ],
    }

    await activeWorkoutStorage.saveDraft(testDraft)
    useWorkoutStore.setState({ draft: testDraft })

    const view = await render(
      <QueryClientProvider client={queryClient}>
        <WorkoutScreen />
      </QueryClientProvider>,
    )
    activeViews.push(view)

    // Wait for loading to settle
    await waitFor(() => {
      expect(view.queryByLabelText('Cargando entrenamiento...')).toBeNull()
    })

    // Summary texts
    expect(view.getByText('Entrenamiento en curso')).toBeTruthy()
    expect(view.getByText('Tienes un entrenamiento sin finalizar.')).toBeTruthy()

    // Exercise counts
    expect(view.getByText('Ejercicios:')).toBeTruthy()
    expect(view.getByText('Series totales:')).toBeTruthy()

    // We expect two elements to have the text "1" (exercises count = 1, sets count = 1)
    const ones = view.getAllByText('1')
    expect(ones).toHaveLength(2)

    // Buttons
    expect(view.getByLabelText('Continuar entrenamiento')).toBeTruthy()
    expect(view.getByLabelText('Descartar entrenamiento')).toBeTruthy()
    expect(view.getByLabelText('Iniciar nuevo entrenamiento')).toBeTruthy()
  })

  // 2. Continuing an existing draft shows the active workout editor
  it('transitions to active workout editor when clicking continuar entrenamiento', async () => {
    const testDraft = {
      version: 1 as const,
      id: 'd3b07384-d113-4ec5-a5ae-be8e3ad5d35a',
      startedAt: '2026-06-12T10:00:00.000Z',
      updatedAt: '2026-06-12T10:00:00.000Z',
      exercises: [],
    }

    await activeWorkoutStorage.saveDraft(testDraft)
    useWorkoutStore.setState({ draft: testDraft })

    const view = await render(
      <QueryClientProvider client={queryClient}>
        <WorkoutScreen />
      </QueryClientProvider>,
    )
    activeViews.push(view)

    // Wait for loading to settle
    await waitFor(() => {
      expect(view.queryByLabelText('Cargando entrenamiento...')).toBeNull()
    })

    expect(view.queryByText('Entrenamiento en marcha')).toBeNull()

    // Press resume button
    fireEvent.press(view.getByLabelText('Continuar entrenamiento'))

    await waitFor(() => {
      expect(view.getByText('Entrenamiento en marcha')).toBeTruthy()
    })
  })

  // 3. Discarding requires confirmation and clears the draft
  it('discards the draft after confirmation', async () => {
    const testDraft = {
      version: 1 as const,
      id: 'd3b07384-d113-4ec5-a5ae-be8e3ad5d35a',
      startedAt: '2026-06-12T10:00:00.000Z',
      updatedAt: '2026-06-12T10:00:00.000Z',
      exercises: [],
    }

    await activeWorkoutStorage.saveDraft(testDraft)
    useWorkoutStore.setState({ draft: testDraft })

    const view = await render(
      <QueryClientProvider client={queryClient}>
        <WorkoutScreen />
      </QueryClientProvider>,
    )
    activeViews.push(view)

    // Wait for loading to settle
    await waitFor(() => {
      expect(view.queryByLabelText('Cargando entrenamiento...')).toBeNull()
    })

    // Press discard button
    fireEvent.press(view.getByLabelText('Descartar entrenamiento'))

    expect(alertSpy).toHaveBeenCalledWith(
      '¿Descartar entrenamiento?',
      'Se perderán las series registradas en este entrenamiento.',
      expect.any(Array),
    )

    // Wait for empty state to appear
    await waitFor(() => {
      expect(view.getByText('¿Listo para entrenar?')).toBeTruthy()
    })

    expect(useWorkoutStore.getState().draft).toBeNull()

    // Storage is cleared
    const stored = await activeWorkoutStorage.loadDraft()
    expect(stored.status).toBe('success')
    if (stored.status === 'success') {
      expect(stored.draft).toBeNull()
    }
  })

  // 4. Discard canceled preserves the draft
  it('preserves the draft if discard confirmation is canceled', async () => {
    const testDraft = {
      version: 1 as const,
      id: 'd3b07384-d113-4ec5-a5ae-be8e3ad5d35a',
      startedAt: '2026-06-12T10:00:00.000Z',
      updatedAt: '2026-06-12T10:00:00.000Z',
      exercises: [],
    }

    await activeWorkoutStorage.saveDraft(testDraft)
    useWorkoutStore.setState({ draft: testDraft })

    // Canceled implementation
    alertSpy.mockImplementation((_title, _message, buttons) => {
      const cancelButton = buttons?.find((b: AlertButton) => b.text === 'Cancelar')
      if (cancelButton?.onPress) {
        cancelButton.onPress()
      }
    })

    const view = await render(
      <QueryClientProvider client={queryClient}>
        <WorkoutScreen />
      </QueryClientProvider>,
    )
    activeViews.push(view)

    // Wait for loading to settle
    await waitFor(() => {
      expect(view.queryByLabelText('Cargando entrenamiento...')).toBeNull()
    })

    fireEvent.press(view.getByLabelText('Descartar entrenamiento'))

    expect(view.queryByText('¿Listo para entrenar?')).toBeNull()
    expect(useWorkoutStore.getState().draft).toEqual(testDraft)
  })

  // 5. No draft shows normal start workflow
  it('shows normal start workflow if no draft exists', async () => {
    const view = await render(
      <QueryClientProvider client={queryClient}>
        <WorkoutScreen />
      </QueryClientProvider>,
    )
    activeViews.push(view)

    // Wait for loading to settle
    await waitFor(() => {
      expect(view.queryByLabelText('Cargando entrenamiento...')).toBeNull()
    })

    expect(view.getByText('¿Listo para entrenar?')).toBeTruthy()
    fireEvent.press(view.getByLabelText('Comenzar Entrenamiento'))

    await waitFor(() => {
      expect(view.getByText('Entrenamiento en marcha')).toBeTruthy()
    })

    expect(useWorkoutStore.getState().draft).not.toBeNull()
  })

  // 6. Starting a new workout while a draft exists does not silently overwrite it
  it('requires confirmation to start a new workout when a draft exists', async () => {
    const testDraft = {
      version: 1 as const,
      id: 'd3b07384-d113-4ec5-a5ae-be8e3ad5d35a',
      startedAt: '2026-06-12T10:00:00.000Z',
      updatedAt: '2026-06-12T10:00:00.000Z',
      exercises: [],
    }

    await activeWorkoutStorage.saveDraft(testDraft)
    useWorkoutStore.setState({ draft: testDraft })

    const view = await render(
      <QueryClientProvider client={queryClient}>
        <WorkoutScreen />
      </QueryClientProvider>,
    )
    activeViews.push(view)

    // Wait for loading to settle
    await waitFor(() => {
      expect(view.queryByLabelText('Cargando entrenamiento...')).toBeNull()
    })

    fireEvent.press(view.getByLabelText('Iniciar nuevo entrenamiento'))

    expect(alertSpy).toHaveBeenCalledWith(
      '¿Descartar entrenamiento?',
      'Se perderán las series registradas en este entrenamiento.',
      expect.any(Array),
    )

    await waitFor(() => {
      expect(view.getByText('Entrenamiento en marcha')).toBeTruthy()
    })

    // ID should have changed (it is a new workout)
    expect(useWorkoutStore.getState().draft?.id).not.toBe(testDraft.id)
  })

  // 7. Old draft without startedAt, if applicable, does not crash and gets filled in
  it('resolves old draft without startedAt successfully without crashing', () => {
    const oldDraftRaw = {
      version: 1,
      id: 'd3b07384-d113-4ec5-a5ae-be8e3ad5d35a',
      updatedAt: '2026-06-12T10:05:00.000Z',
      exercises: [],
    }

    const result = ActiveWorkoutDraftSchema.safeParse(oldDraftRaw)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.startedAt).toBeTruthy()
      expect(Number.isNaN(Date.parse(result.data.startedAt))).toBe(false)
    }
  })
})
