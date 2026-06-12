import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Pressable, Text } from 'react-native';
import { ExercisePicker } from '@/features/workout/components/ExercisePicker';
import { useFinishWorkout } from '@/features/workout/hooks/use-finish-workout';
import { activeWorkoutStorage } from '@/features/workout/persistence/active-workout-storage';
import { ActiveWorkoutDraftSchema } from '@/features/workout/schemas/active-workout-draft';
import { useWorkoutStore } from '@/features/workout/store/workout-store';
import { mapDraftToCreateRequest } from '@/features/workout/utils/workout-draft';
import { createTestQueryClient } from '@/shared/query/client';

// Mock expo-router
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

// Mock API Client
jest.mock('@/features/auth/api/mobile-auth-api', () => ({
  mobileApiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockUseExercises = jest.fn(() => ({
  data: [] as unknown[],
  isLoading: false,
  isError: false,
  error: null as Error | null,
}));
jest.mock('@/features/exercises/hooks/use-exercises', () => ({
  useExercises: () => mockUseExercises(),
}));
jest.mock('../src/features/exercises/hooks/use-exercises', () => ({
  useExercises: () => mockUseExercises(),
}));

jest.mock('react-native/Libraries/Modal/Modal', () => {
  const MockModal = ({ children, visible }: { children: React.ReactNode; visible: boolean }) => {
    const { View } = require('react-native');
    if (visible === false) return null;
    return <View>{children}</View>;
  };
  return {
    __esModule: true,
    default: MockModal,
  };
});

import { mobileApiClient } from '@/features/auth/api/mobile-auth-api';

describe('Active Workout Flow', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    useWorkoutStore.setState({
      draft: null,
      isLoading: false,
      isCorrupted: false,
      corruptedRaw: '',
      error: null,
    });
  });

  // 1. Draft schema parse success
  it('validates draft schema successfully with valid active workout draft', () => {
    const validDraft = {
      version: 1,
      id: 'd3b07384-d113-4ec5-a5ae-be8e3ad5d35a',
      startedAt: '2026-06-12T00:00:00.000Z',
      updatedAt: '2026-06-12T00:00:00.000Z',
      exercises: [
        {
          draftExerciseId: 'exercise_1',
          exerciseId: 55,
          exerciseName: 'Squat',
          exerciseType: 'WEIGHT_REPS',
          sets: [
            {
              draftSetId: 'set_1',
              weightGrams: 100500,
              reps: 8,
              createdAt: '2026-06-12T00:00:10.000Z',
              updatedAt: '2026-06-12T00:00:10.000Z',
            },
          ],
        },
      ],
    };

    const result = ActiveWorkoutDraftSchema.safeParse(validDraft);
    expect(result.success).toBe(true);
  });

  // 2. No auth tokens stored in draft
  it('never stores authentication tokens inside active workout draft structures', () => {
    const validDraftKeys = Object.keys(ActiveWorkoutDraftSchema.shape);
    expect(validDraftKeys).not.toContain('token');
    expect(validDraftKeys).not.toContain('accessToken');
    expect(validDraftKeys).not.toContain('refreshToken');
  });

  // 3. Draft persistence load/save/clear
  it('correctly saves, loads and clears draft in AsyncStorage', async () => {
    const testDraft = {
      version: 1 as const,
      id: 'd3b07384-d113-4ec5-a5ae-be8e3ad5d35b',
      startedAt: '2026-06-12T00:00:00.000Z',
      updatedAt: '2026-06-12T00:00:00.000Z',
      exercises: [],
    };

    const saved = await activeWorkoutStorage.saveDraft(testDraft);
    expect(saved).toBe(true);

    const loaded = await activeWorkoutStorage.loadDraft();
    expect(loaded.status).toBe('success');
    if (loaded.status === 'success') {
      expect(loaded.draft).toEqual(testDraft);
    }

    const cleared = await activeWorkoutStorage.clearDraft();
    expect(cleared).toBe(true);

    const loadedAfterClear = await activeWorkoutStorage.loadDraft();
    expect(loadedAfterClear.status).toBe('success');
    if (loadedAfterClear.status === 'success') {
      expect(loadedAfterClear.draft).toBeNull();
    }
  });

  // 4. Corrupted draft recovery
  it('handles corrupted draft gracefully without crashing and allows recovery', async () => {
    // Write corrupted JSON to AsyncStorage
    await AsyncStorage.setItem('gymnotebook.mobile.v1.activeWorkout', '{invalid_json}');

    const loaded = await activeWorkoutStorage.loadDraft();
    expect(loaded.status).toBe('corrupted');

    // Restore draft inside store updates store as corrupted
    await useWorkoutStore.getState().restoreDraft();
    expect(useWorkoutStore.getState().isCorrupted).toBe(true);
    expect(useWorkoutStore.getState().draft).toBeNull();

    // Call discard to reset store state and clear storage
    await useWorkoutStore.getState().discardWorkout();
    expect(useWorkoutStore.getState().isCorrupted).toBe(false);
    expect(useWorkoutStore.getState().draft).toBeNull();

    const loadedAfterDiscard = await activeWorkoutStorage.loadDraft();
    expect(loadedAfterDiscard.status).toBe('success');
    if (loadedAfterDiscard.status === 'success') {
      expect(loadedAfterDiscard.draft).toBeNull();
    }
  });

  // 5. Store mutations: start workout
  it('starts workout and sets correct initial state in the store', async () => {
    await useWorkoutStore.getState().startWorkout();
    const state = useWorkoutStore.getState();

    expect(state.draft).not.toBeNull();
    expect(state.draft?.exercises).toEqual([]);
    expect(state.draft?.id).toBeTruthy();
    expect(state.draft?.startedAt).toBeTruthy();
    expect(state.draft?.updatedAt).toBeTruthy();
  });

  // 6. Store mutations: add exercise & prevent duplicates
  it('adds exercise to draft and prevents adding duplicate exercises', async () => {
    await useWorkoutStore.getState().startWorkout();

    // Add Squat
    await useWorkoutStore.getState().addExercise(1, 'Squat', 'WEIGHT_REPS');
    expect(useWorkoutStore.getState().draft?.exercises).toHaveLength(1);
    expect(useWorkoutStore.getState().draft?.exercises[0]?.exerciseName).toBe('Squat');

    // Add Squat again (duplicate)
    await useWorkoutStore.getState().addExercise(1, 'Squat', 'WEIGHT_REPS');
    expect(useWorkoutStore.getState().draft?.exercises).toHaveLength(1);

    // Add Bench Press
    await useWorkoutStore.getState().addExercise(2, 'Bench Press', 'WEIGHT_REPS');
    expect(useWorkoutStore.getState().draft?.exercises).toHaveLength(2);
  });

  // 7. Store mutations: remove exercise
  it('removes exercise from active workout draft', async () => {
    await useWorkoutStore.getState().startWorkout();
    await useWorkoutStore.getState().addExercise(1, 'Squat', 'WEIGHT_REPS');
    const draft = useWorkoutStore.getState().draft;
    if (!draft?.exercises[0]) throw new Error('No exercise');
    const draftExerciseId = draft.exercises[0].draftExerciseId;

    await useWorkoutStore.getState().removeExercise(draftExerciseId);
    expect(useWorkoutStore.getState().draft?.exercises).toHaveLength(0);
  });

  // 8. Store mutations: add set with correct fields for multiple exercise types
  it('adds set with proper fields based on exercise type', async () => {
    await useWorkoutStore.getState().startWorkout();

    const getDraft = () => {
      const d = useWorkoutStore.getState().draft;
      if (!d) throw new Error('No draft');
      return d;
    };

    // 1. WEIGHT_REPS
    await useWorkoutStore.getState().addExercise(1, 'Bench Press', 'WEIGHT_REPS');
    const ex1 = getDraft().exercises[0];
    if (!ex1) throw new Error('No exercise 1');
    await useWorkoutStore.getState().addSet(ex1.draftExerciseId, {
      weightGrams: 80000,
      reps: 5,
      timeSeconds: null,
      distanceMeters: null,
    });

    // 2. REPS
    await useWorkoutStore.getState().addExercise(2, 'Pull-up', 'REPS');
    const ex2 = getDraft().exercises[1];
    if (!ex2) throw new Error('No exercise 2');
    await useWorkoutStore.getState().addSet(ex2.draftExerciseId, {
      weightGrams: null,
      reps: 10,
      timeSeconds: null,
      distanceMeters: null,
    });

    // 3. TIME_DISTANCE
    await useWorkoutStore.getState().addExercise(3, 'Running', 'TIME_DISTANCE');
    const ex3 = getDraft().exercises[2];
    if (!ex3) throw new Error('No exercise 3');
    await useWorkoutStore.getState().addSet(ex3.draftExerciseId, {
      weightGrams: null,
      reps: null,
      timeSeconds: 600,
      distanceMeters: 2000,
    });

    const finalDraft = getDraft();
    expect(finalDraft.exercises[0]?.sets[0]).toMatchObject({
      weightGrams: 80000,
      reps: 5,
    });
    expect(finalDraft.exercises[1]?.sets[0]).toMatchObject({
      reps: 10,
    });
    expect(finalDraft.exercises[2]?.sets[0]).toMatchObject({
      timeSeconds: 600,
      distanceMeters: 2000,
    });
  });

  // 9. Store mutations: edit set
  it('updates an existing set with new field values', async () => {
    await useWorkoutStore.getState().startWorkout();
    await useWorkoutStore.getState().addExercise(1, 'Bench Press', 'WEIGHT_REPS');

    const getDraft = () => {
      const d = useWorkoutStore.getState().draft;
      if (!d) throw new Error('No draft');
      return d;
    };

    const ex = getDraft().exercises[0];
    if (!ex) throw new Error('No exercise');
    await useWorkoutStore.getState().addSet(ex.draftExerciseId, {
      weightGrams: 80000,
      reps: 5,
    });

    const draftSetId = getDraft().exercises[0]?.sets[0]?.draftSetId;
    if (!draftSetId) throw new Error('No draftSetId');

    await useWorkoutStore.getState().updateSet(ex.draftExerciseId, draftSetId, {
      weightGrams: 85000,
      reps: 4,
    });

    const set = getDraft().exercises[0]?.sets[0];
    if (!set) throw new Error('No set');
    expect(set.weightGrams).toBe(85000);
    expect(set.reps).toBe(4);
  });

  // 10. Store mutations: delete set
  it('removes a set from an exercise in the draft', async () => {
    await useWorkoutStore.getState().startWorkout();
    await useWorkoutStore.getState().addExercise(1, 'Bench Press', 'WEIGHT_REPS');

    const getDraft = () => {
      const d = useWorkoutStore.getState().draft;
      if (!d) throw new Error('No draft');
      return d;
    };

    const ex = getDraft().exercises[0];
    if (!ex) throw new Error('No exercise');
    await useWorkoutStore.getState().addSet(ex.draftExerciseId, {
      weightGrams: 80000,
      reps: 5,
    });

    const draftSetId = getDraft().exercises[0]?.sets[0]?.draftSetId;
    if (!draftSetId) throw new Error('No draftSetId');

    await useWorkoutStore.getState().deleteSet(ex.draftExerciseId, draftSetId);
    expect(getDraft().exercises[0]?.sets).toHaveLength(0);
  });

  // 11. Finish workout mapping to backend request
  it('properly maps local draft to backend contract structure, preserves exact weightGrams, and excludes empty exercises', () => {
    const draft = {
      version: 1 as const,
      id: 'd3b07384-d113-4ec5-a5ae-be8e3ad5d35a',
      startedAt: '2026-06-12T00:00:00.000Z',
      updatedAt: '2026-06-12T00:00:00.000Z',
      exercises: [
        {
          draftExerciseId: 'exercise_1',
          exerciseId: 55,
          exerciseName: 'Squat',
          exerciseType: 'WEIGHT_REPS' as const,
          sets: [
            {
              draftSetId: 'set_1',
              weightGrams: 82500, // 82.5 kg -> 82500 grams
              reps: 8,
              timeSeconds: null,
              distanceMeters: null,
              createdAt: '2026-06-12T00:00:10.000Z',
              updatedAt: '2026-06-12T00:00:10.000Z',
            },
            {
              draftSetId: 'set_2',
              weightGrams: 80000, // 80 kg -> 80000 grams
              reps: 6,
              timeSeconds: null,
              distanceMeters: null,
              createdAt: '2026-06-12T00:00:20.000Z',
              updatedAt: '2026-06-12T00:00:20.000Z',
            },
          ],
        },
        {
          draftExerciseId: 'exercise_2',
          exerciseId: 60,
          exerciseName: 'Bench Press',
          exerciseType: 'WEIGHT_REPS' as const,
          sets: [], // Empty exercise, should be excluded
        },
      ],
    };

    const payload = mapDraftToCreateRequest(draft, '2026-06-12T01:00:00.000Z');

    expect(payload).toEqual({
      uuid: 'd3b07384-d113-4ec5-a5ae-be8e3ad5d35a',
      startDate: '2026-06-12T00:00:00.000Z',
      endDate: '2026-06-12T01:00:00.000Z',
      notes: null,
      workoutSets: [
        {
          exercise: { id: 55 },
          startDate: '2026-06-12T00:00:00.000Z',
          endDate: '2026-06-12T01:00:00.000Z',
          notes: null,
          sets: [
            {
              reps: 8,
              weight: 82500, // Exact grams mapped without rounding
              time: 0,
              distance: 0,
              notes: null,
              isDropSet: false,
              startDate: '2026-06-12T00:00:10.000Z',
            },
            {
              reps: 6,
              weight: 80000,
              time: 0,
              distance: 0,
              notes: null,
              isDropSet: false,
              startDate: '2026-06-12T00:00:20.000Z',
            },
          ],
        },
      ],
    });
  });

  it('refuses mapping when total sets is zero (exercises exist but no sets)', () => {
    const draft = {
      version: 1 as const,
      id: 'd3b07384-d113-4ec5-a5ae-be8e3ad5d35a',
      startedAt: '2026-06-12T00:00:00.000Z',
      updatedAt: '2026-06-12T00:00:00.000Z',
      exercises: [
        {
          draftExerciseId: 'exercise_1',
          exerciseId: 55,
          exerciseName: 'Squat',
          exerciseType: 'WEIGHT_REPS' as const,
          sets: [],
        },
      ],
    };

    expect(() => mapDraftToCreateRequest(draft, '2026-06-12T01:00:00.000Z')).toThrow(
      'No se puede guardar un entrenamiento con cero series',
    );
  });

  // 12a. Save failure keeps draft
  it('preserves draft on API failure', async () => {
    const queryClient = createTestQueryClient();
    await useWorkoutStore.getState().startWorkout();
    await useWorkoutStore.getState().addExercise(1, 'Squat', 'WEIGHT_REPS');
    const ex = useWorkoutStore.getState().draft?.exercises[0];
    if (!ex) throw new Error('No exercise');
    await useWorkoutStore.getState().addSet(ex.draftExerciseId, {
      weightGrams: 80000,
      reps: 5,
    });

    const mockPost = mobileApiClient.post as jest.Mock;
    mockPost.mockRejectedValueOnce(new Error('Network error'));

    function TestComponent() {
      const finishMutation = useFinishWorkout();
      return (
        <React.Fragment>
          <Pressable accessibilityLabel="Finish" onPress={() => finishMutation.mutate()}>
            <Text>Finish</Text>
          </Pressable>
          {finishMutation.isError && <Text>Error</Text>}
        </React.Fragment>
      );
    }

    const view = await render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>,
    );

    fireEvent.press(view.getByLabelText('Finish'));

    await waitFor(() => {
      expect(view.getByText('Error')).toBeTruthy();
    });

    expect(useWorkoutStore.getState().draft).not.toBeNull();
    view.unmount();
    queryClient.clear();
  });

  // 12b. Save success clears draft and redirects
  it('clears draft on successful API save and redirects', async () => {
    const queryClient = createTestQueryClient();
    await useWorkoutStore.getState().startWorkout();
    await useWorkoutStore.getState().addExercise(1, 'Squat', 'WEIGHT_REPS');
    const ex = useWorkoutStore.getState().draft?.exercises[0];
    if (!ex) throw new Error('No exercise');
    await useWorkoutStore.getState().addSet(ex.draftExerciseId, {
      weightGrams: 80000,
      reps: 5,
    });

    const mockPost = mobileApiClient.post as jest.Mock;
    mockPost.mockResolvedValueOnce({ data: { success: true } });

    function TestComponent() {
      const finishMutation = useFinishWorkout();
      return (
        <React.Fragment>
          <Pressable accessibilityLabel="Finish" onPress={() => finishMutation.mutate()}>
            <Text>Finish</Text>
          </Pressable>
          {finishMutation.isSuccess && <Text>Success</Text>}
        </React.Fragment>
      );
    }

    const view2 = await render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>,
    );

    fireEvent.press(view2.getByLabelText('Finish'));

    await waitFor(() => {
      expect(view2.getByText('Success')).toBeTruthy();
      expect(mockReplace).toHaveBeenCalledWith('/(authenticated)/(tabs)/history');
    });

    expect(useWorkoutStore.getState().draft).toBeNull();
    const stored = await activeWorkoutStorage.loadDraft();
    expect(stored.status).toBe('success');
    if (stored.status === 'success') {
      expect(stored.draft).toBeNull();
    }
    view2.unmount();
    queryClient.clear();
  });

  // 12c. Save blocked when exercises exist but total sets is zero
  it('blocks saving and throws error when exercises exist but total sets is zero', async () => {
    const queryClient = createTestQueryClient();
    await useWorkoutStore.getState().startWorkout();
    await useWorkoutStore.getState().addExercise(1, 'Squat', 'WEIGHT_REPS');

    function TestComponent() {
      const finishMutation = useFinishWorkout();
      return (
        <React.Fragment>
          <Pressable accessibilityLabel="Finish" onPress={() => finishMutation.mutate()}>
            <Text>Finish</Text>
          </Pressable>
          {finishMutation.isError && <Text>{finishMutation.error?.message}</Text>}
        </React.Fragment>
      );
    }

    const view3 = await render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>,
    );

    fireEvent.press(view3.getByLabelText('Finish'));

    await waitFor(() => {
      expect(
        view3.getByText('No se puede guardar un entrenamiento sin series registradas'),
      ).toBeTruthy();
    });

    expect(useWorkoutStore.getState().draft).not.toBeNull();
    view3.unmount();
    queryClient.clear();
  });

  // 13. ExercisePicker loading state
  it('renders ExercisePicker loading state properly', async () => {
    const queryClient = createTestQueryClient();
    const mockOnSelect = jest.fn();
    const mockOnClose = jest.fn();

    mockUseExercises.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
      error: null,
    });

    const view = await render(
      <QueryClientProvider client={queryClient}>
        <ExercisePicker
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          alreadySelectedIds={[]}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(view.getByLabelText('Cargando ejercicios')).toBeTruthy();
    });
    view.unmount();
    queryClient.clear();
  });

  // 14. ExercisePicker error state
  it('renders ExercisePicker error state properly', async () => {
    const queryClient = createTestQueryClient();
    const mockOnSelect = jest.fn();
    const mockOnClose = jest.fn();

    mockUseExercises.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      error: new Error('Failed to load'),
    });

    const view = await render(
      <QueryClientProvider client={queryClient}>
        <ExercisePicker
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          alreadySelectedIds={[]}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(view.getByText('Failed to load')).toBeTruthy();
    });
    view.unmount();
    queryClient.clear();
  });

  // 15. ExercisePicker list and selection
  it('renders ExercisePicker exercises list and handles selection', async () => {
    const queryClient = createTestQueryClient();
    const mockOnSelect = jest.fn();
    const mockOnClose = jest.fn();

    const exercisesList = [
      { id: 10, name: 'Squat', type: 'WEIGHT_REPS', primaryMuscleGroup: 'QUADRICEPS' },
      { id: 20, name: 'Bench Press', type: 'WEIGHT_REPS', primaryMuscleGroup: 'CHEST' },
    ];
    mockUseExercises.mockReturnValue({
      data: exercisesList,
      isLoading: false,
      isError: false,
      error: null,
    });

    const view = await render(
      <QueryClientProvider client={queryClient}>
        <ExercisePicker
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          alreadySelectedIds={[10]} // Already added Squat, should only show Bench Press
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(view.queryByText('Squat')).toBeNull();
      expect(view.getByText('Bench Press')).toBeTruthy();
    });

    fireEvent.press(view.getByLabelText('Seleccionar Bench Press'));
    expect(mockOnSelect).toHaveBeenCalledWith(exercisesList[1]);
    expect(mockOnClose).toHaveBeenCalled();
    view.unmount();
    queryClient.clear();
  });
});
