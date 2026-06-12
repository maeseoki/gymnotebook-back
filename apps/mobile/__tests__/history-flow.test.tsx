import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, type RenderResult, render, waitFor } from '@testing-library/react-native'
import type React from 'react'
import { Alert } from 'react-native'
import { createTestQueryClient } from '@/shared/query/client'
import { historyApi } from '../src/features/history/api/history-api'
import { HistoryListScreen } from '../src/features/history/components/HistoryListScreen'
import { HistoryWorkoutDetailScreen } from '../src/features/history/components/HistoryWorkoutDetailScreen'

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

// Mock expo-router
const mockPush = jest.fn()
const mockReplace = jest.fn()

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
  useRouter: () => ({
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  }),
}))

// Mock historyApi
jest.mock('../src/features/history/api/history-api', () => {
  return {
    historyApi: {
      getWorkoutDays: jest.fn(),
      getWorkoutsByDate: jest.fn(),
    },
    HistoryApiError: class extends Error {
      constructor(readonly mockFailure: { message?: string }) {
        super(mockFailure.message)
      }
    },
  }
})

// Mock historyMutationsApi
jest.mock('../src/features/history/api/history-mutations-api', () => {
  return {
    historyMutationsApi: {
      updateWorkoutSet: jest.fn(),
      deleteWorkoutSet: jest.fn(),
      deleteWorkout: jest.fn(),
    },
  }
})

import { historyMutationsApi } from '../src/features/history/api/history-mutations-api'

const mockGetWorkoutDays = historyApi.getWorkoutDays as jest.Mock
const mockGetWorkoutsByDate = historyApi.getWorkoutsByDate as jest.Mock
const mockUpdateWorkoutSet = historyMutationsApi.updateWorkoutSet as jest.Mock
const mockDeleteWorkoutSet = historyMutationsApi.deleteWorkoutSet as jest.Mock
const mockDeleteWorkout = historyMutationsApi.deleteWorkout as jest.Mock

const mockWorkout = {
  id: 1,
  uuid: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  startDate: '2026-06-12T10:00:00Z',
  endDate: '2026-06-12T11:00:00Z',
  notes: 'My morning workout',
  workoutSets: [
    {
      id: 1,
      startDate: '2026-06-12T10:00:00Z',
      endDate: '2026-06-12T11:00:00Z',
      notes: null,
      exercise: {
        id: 1,
        name: 'Bench Press',
        description: 'Chest movement',
        type: 'WEIGHT_REPS',
        primaryMuscleGroup: 'CHEST',
        secondaryMuscleGroup: 'TRICEPS',
        imageId: null,
      },
      sets: [
        {
          id: 1,
          reps: 10,
          weight: 82500,
          time: 0,
          distance: 0,
          notes: null,
          isDropSet: false,
        },
      ],
    },
  ],
}

let activeViews: RenderResult[] = []
let activeQueryClients: QueryClient[] = []

async function renderWithQuery(ui: React.ReactNode) {
  const qc = createTestQueryClient()
  activeQueryClients.push(qc)
  const view = await render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
  activeViews.push(view)
  return { view, qc }
}

describe('History Workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    activeViews = []
    activeQueryClients = []
    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      const confirmButton = buttons?.find(
        (btn) => btn.style === 'destructive' || btn.text === 'Eliminar',
      )
      if (confirmButton && confirmButton.onPress) {
        confirmButton.onPress()
      }
    })
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
    jest.restoreAllMocks()
    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  describe('HistoryListScreen', () => {
    it('shows loading indicator initially', async () => {
      mockGetWorkoutDays.mockReturnValue(new Promise(() => {})) // Never resolves
      const { view } = await renderWithQuery(<HistoryListScreen />)
      expect(view.getByLabelText('Cargando historial...')).toBeTruthy()
    })

    it('shows empty state when no workouts exist', async () => {
      mockGetWorkoutDays.mockResolvedValue([])
      const { view } = await renderWithQuery(<HistoryListScreen />)
      await waitFor(() => {
        expect(view.getByText('No hay entrenamientos registrados en este mes.')).toBeTruthy()
      })
    })

    it('shows error state with retry button', async () => {
      mockGetWorkoutDays.mockRejectedValue(new Error('Network error'))
      const { view } = await renderWithQuery(<HistoryListScreen />)
      await waitFor(() => {
        expect(view.getByText('Ocurrió un error inesperado al cargar el historial.')).toBeTruthy()
        expect(view.getByText('Reintentar')).toBeTruthy()
      })

      mockGetWorkoutDays.mockResolvedValue([12])
      mockGetWorkoutsByDate.mockResolvedValue([mockWorkout])

      fireEvent.press(view.getByText('Reintentar'))

      await waitFor(() => {
        expect(view.getByText('My morning workout')).toBeTruthy()
      })
    })

    it('lists workout cards on success and handles navigation', async () => {
      mockGetWorkoutDays.mockResolvedValue([12])
      mockGetWorkoutsByDate.mockResolvedValue([mockWorkout])

      const { view } = await renderWithQuery(<HistoryListScreen />)

      await waitFor(() => {
        expect(view.getByText('My morning workout')).toBeTruthy()
        expect(view.getByText('Bench Press')).toBeTruthy()
      })

      // Pressing card triggers navigation
      const pressable = view.getByRole('button', { name: /Ver detalles del entrenamiento/ })
      fireEvent.press(pressable)

      expect(mockPush).toHaveBeenCalledWith('/(authenticated)/history/day/2026-06-12')
    })
  })

  describe('HistoryWorkoutDetailScreen', () => {
    it('renders detail loader, empty state, and detailed exercises list', async () => {
      mockGetWorkoutsByDate.mockResolvedValue([])
      const { view } = await renderWithQuery(<HistoryWorkoutDetailScreen date="2026-06-12" />)

      await waitFor(() => {
        expect(view.getByText('No se encontraron entrenamientos para este día.')).toBeTruthy()
      })
    })

    it('renders detailed exercise list and exposes edit/delete buttons', async () => {
      mockGetWorkoutsByDate.mockResolvedValue([mockWorkout])
      const { view } = await renderWithQuery(<HistoryWorkoutDetailScreen date="2026-06-12" />)

      await waitFor(() => {
        expect(view.getByText('Bench Press')).toBeTruthy()
        expect(view.getByText('82.5 kg x 10 reps')).toBeTruthy()
      })

      // Ensure that edit/delete controls ARE rendered/exposed in the UI now
      expect(view.getByText('Editar')).toBeTruthy()
      expect(view.getAllByText('Eliminar').length).toBeGreaterThan(0)

      // Ensure unsupported add controls (e.g. adding set/exercise to completed workout) are NOT shown
      expect(view.queryByText('Agregar serie')).toBeNull()
      expect(view.queryByText('Añadir Serie')).toBeNull()
      expect(view.queryByText('Agregar ejercicio')).toBeNull()
    })

    it('edit set success invalidates workouts queries', async () => {
      mockGetWorkoutsByDate.mockResolvedValue([mockWorkout])
      const { view, qc } = await renderWithQuery(<HistoryWorkoutDetailScreen date="2026-06-12" />)

      await waitFor(() => {
        expect(view.getByText('Editar')).toBeTruthy()
      })

      const invalidateSpy = jest.spyOn(qc, 'invalidateQueries')
      mockUpdateWorkoutSet.mockResolvedValue({
        id: 1,
        reps: 12,
        weight: 85000,
        time: 0,
        distance: 0,
        notes: 'Feel good',
        isDropSet: false,
      })

      // Open Edit Modal
      fireEvent.press(view.getByText('Editar'))

      // Save (await findByLabelText to wait for Modal updates)
      const saveBtn = await view.findByLabelText('Boton Guardar Serie')
      fireEvent.press(saveBtn)

      await waitFor(() => {
        expect(mockUpdateWorkoutSet).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ reps: 10, weight: 82500 }),
        )
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['mobile', 'workouts'],
        })
      })
    })

    it('edit set failure keeps modal/screen usable', async () => {
      mockGetWorkoutsByDate.mockResolvedValue([mockWorkout])
      const { view } = await renderWithQuery(<HistoryWorkoutDetailScreen date="2026-06-12" />)

      await waitFor(() => {
        expect(view.getByText('Editar')).toBeTruthy()
      })

      mockUpdateWorkoutSet.mockRejectedValue(new Error('Update failed'))

      // Open Edit Modal
      fireEvent.press(view.getByText('Editar'))

      // Save (await findByLabelText to wait for Modal updates)
      const saveBtn = await view.findByLabelText('Boton Guardar Serie')
      fireEvent.press(saveBtn)

      await waitFor(() => {
        // Modal is still open (contains the Cancel/Save buttons)
        expect(view.getByLabelText('Boton Guardar Serie')).toBeTruthy()
        expect(view.getByText('Ocurrió un error inesperado al cargar el historial.')).toBeTruthy()
      })
    })

    it('delete set requires confirmation and calls endpoint', async () => {
      mockGetWorkoutsByDate.mockResolvedValue([mockWorkout])
      const { view, qc } = await renderWithQuery(<HistoryWorkoutDetailScreen date="2026-06-12" />)

      await waitFor(() => {
        expect(view.getByText('Editar')).toBeTruthy()
      })

      const invalidateSpy = jest.spyOn(qc, 'invalidateQueries')
      mockDeleteWorkoutSet.mockResolvedValue(null)

      // Press delete on the set row
      fireEvent.press(view.getByRole('button', { name: 'Eliminar serie 1' }))

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Eliminar serie',
          '¿Estás seguro de que deseas eliminar esta serie?',
          expect.any(Array),
        )
        expect(mockDeleteWorkoutSet).toHaveBeenCalledWith(1)
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['mobile', 'workouts'],
        })
      })
    })

    it('delete workout requires confirmation and calls endpoint', async () => {
      mockGetWorkoutsByDate.mockResolvedValue([mockWorkout])
      const { view, qc } = await renderWithQuery(<HistoryWorkoutDetailScreen date="2026-06-12" />)

      await waitFor(() => {
        expect(view.getByLabelText('Eliminar entrenamiento completo')).toBeTruthy()
      })

      const invalidateSpy = jest.spyOn(qc, 'invalidateQueries')
      mockDeleteWorkout.mockResolvedValue(null)

      // Press delete on workout card
      fireEvent.press(view.getByLabelText('Eliminar entrenamiento completo'))

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Eliminar entrenamiento',
          '¿Estás seguro de que deseas eliminar por completo este entrenamiento? Esta acción no se puede deshacer.',
          expect.any(Array),
        )
        expect(mockDeleteWorkout).toHaveBeenCalledWith(1)
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['mobile', 'workouts'],
        })
      })
    })
  })
})
