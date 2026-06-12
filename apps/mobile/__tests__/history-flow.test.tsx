import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, type RenderResult, render, waitFor } from '@testing-library/react-native';
import type React from 'react';
import { createTestQueryClient } from '@/shared/query/client';
import { historyApi } from '../src/features/history/api/history-api';
import { HistoryListScreen } from '../src/features/history/components/HistoryListScreen';
import { HistoryWorkoutDetailScreen } from '../src/features/history/components/HistoryWorkoutDetailScreen';

// Mock expo-router
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
  useRouter: () => ({
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  }),
}));

// Mock historyApi
jest.mock('../src/features/history/api/history-api', () => {
  return {
    historyApi: {
      getWorkoutDays: jest.fn(),
      getWorkoutsByDate: jest.fn(),
    },
    HistoryApiError: class extends Error {
      constructor(readonly mockFailure: { message?: string }) {
        super(mockFailure.message);
      }
    },
  };
});

const mockGetWorkoutDays = historyApi.getWorkoutDays as jest.Mock;
const mockGetWorkoutsByDate = historyApi.getWorkoutsByDate as jest.Mock;

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
};

let activeViews: RenderResult[] = [];
let activeQueryClients: QueryClient[] = [];

async function renderWithQuery(ui: React.ReactNode) {
  const qc = createTestQueryClient();
  activeQueryClients.push(qc);
  const view = await render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
  activeViews.push(view);
  return { view, qc };
}

describe('History Workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    activeViews = [];
    activeQueryClients = [];
  });

  afterEach(async () => {
    for (const view of activeViews) {
      try {
        view.unmount();
      } catch (_e) {}
    }
    for (const qc of activeQueryClients) {
      qc.clear();
    }
    activeQueryClients = [];
    activeViews = [];
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  describe('HistoryListScreen', () => {
    it('shows loading indicator initially', async () => {
      mockGetWorkoutDays.mockReturnValue(new Promise(() => {})); // Never resolves
      const { view } = await renderWithQuery(<HistoryListScreen />);
      expect(view.getByLabelText('Cargando historial...')).toBeTruthy();
    });

    it('shows empty state when no workouts exist', async () => {
      mockGetWorkoutDays.mockResolvedValue([]);
      const { view } = await renderWithQuery(<HistoryListScreen />);
      await waitFor(() => {
        expect(view.getByText('No hay entrenamientos registrados en este mes.')).toBeTruthy();
      });
    });

    it('shows error state with retry button', async () => {
      mockGetWorkoutDays.mockRejectedValue(new Error('Network error'));
      const { view } = await renderWithQuery(<HistoryListScreen />);
      await waitFor(() => {
        expect(view.getByText('Ocurrió un error inesperado al cargar el historial.')).toBeTruthy();
        expect(view.getByText('Reintentar')).toBeTruthy();
      });

      mockGetWorkoutDays.mockResolvedValue([12]);
      mockGetWorkoutsByDate.mockResolvedValue([mockWorkout]);

      fireEvent.press(view.getByText('Reintentar'));

      await waitFor(() => {
        expect(view.getByText('My morning workout')).toBeTruthy();
      });
    });

    it('lists workout cards on success and handles navigation', async () => {
      mockGetWorkoutDays.mockResolvedValue([12]);
      mockGetWorkoutsByDate.mockResolvedValue([mockWorkout]);

      const { view } = await renderWithQuery(<HistoryListScreen />);

      await waitFor(() => {
        expect(view.getByText('My morning workout')).toBeTruthy();
        expect(view.getByText('Bench Press')).toBeTruthy();
      });

      // Pressing card triggers navigation
      const pressable = view.getByRole('button', { name: /Ver detalles del entrenamiento/ });
      fireEvent.press(pressable);

      expect(mockPush).toHaveBeenCalledWith('/(authenticated)/history/day/2026-06-12');
    });
  });

  describe('HistoryWorkoutDetailScreen', () => {
    it('renders detail loader, empty state, and detailed exercises list', async () => {
      mockGetWorkoutsByDate.mockResolvedValue([]);
      const { view } = await renderWithQuery(<HistoryWorkoutDetailScreen date="2026-06-12" />);

      await waitFor(() => {
        expect(view.getByText('No se encontraron entrenamientos para este día.')).toBeTruthy();
      });
    });

    it('renders detailed exercise list when workouts exist', async () => {
      mockGetWorkoutsByDate.mockResolvedValue([mockWorkout]);
      const { view } = await renderWithQuery(<HistoryWorkoutDetailScreen date="2026-06-12" />);

      await waitFor(() => {
        expect(view.getByText('Bench Press')).toBeTruthy();
        expect(view.getByText('82.5 kg x 10 reps')).toBeTruthy();
      });
    });
  });
});
