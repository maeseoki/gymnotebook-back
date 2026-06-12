import { useWorkoutStore } from '../store/workout-store';

export function useActiveWorkoutDraft() {
  const store = useWorkoutStore();
  return {
    draft: store.draft,
    isLoading: store.isLoading,
    isCorrupted: store.isCorrupted,
    corruptedRaw: store.corruptedRaw,
    error: store.error,
    restoreDraft: store.restoreDraft,
    startWorkout: store.startWorkout,
    addExercise: store.addExercise,
    removeExercise: store.removeExercise,
    addSet: store.addSet,
    updateSet: store.updateSet,
    deleteSet: store.deleteSet,
    discardWorkout: store.discardWorkout,
    clearWorkout: store.clearWorkout,
  };
}
