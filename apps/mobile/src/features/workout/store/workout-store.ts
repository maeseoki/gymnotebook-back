import type { EExerciseType } from '@gymnotebook/contracts'
import { create } from 'zustand'
import { activeWorkoutStorage } from '../persistence/active-workout-storage'
import type {
  ActiveWorkoutDraft,
  ActiveWorkoutExercise,
  ActiveWorkoutSet,
} from '../schemas/active-workout-draft'

export function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function generateLocalId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`
}

export interface WorkoutState {
  draft: ActiveWorkoutDraft | null
  isLoading: boolean
  isCorrupted: boolean
  corruptedRaw: string
  error: string | null

  restoreDraft: () => Promise<void>
  startWorkout: () => Promise<void>
  addExercise: (exerciseId: number, name: string, type: EExerciseType) => Promise<void>
  removeExercise: (draftExerciseId: string) => Promise<void>
  addSet: (
    draftExerciseId: string,
    set: Omit<ActiveWorkoutSet, 'draftSetId' | 'createdAt' | 'updatedAt'>,
  ) => Promise<void>
  updateSet: (
    draftExerciseId: string,
    draftSetId: string,
    setUpdates: Partial<Omit<ActiveWorkoutSet, 'draftSetId' | 'createdAt' | 'updatedAt'>>,
  ) => Promise<void>
  deleteSet: (draftExerciseId: string, draftSetId: string) => Promise<void>
  discardWorkout: () => Promise<void>
  clearWorkout: () => Promise<void>
}

export const useWorkoutStore = create<WorkoutState>((set, get) => {
  // Helper to update draft, update timestamp, and persist
  const updateAndPersist = async (updater: (draft: ActiveWorkoutDraft) => ActiveWorkoutDraft) => {
    const currentDraft = get().draft
    if (!currentDraft) return

    const newDraft = updater({
      ...currentDraft,
      updatedAt: new Date().toISOString(),
    })

    set({ draft: newDraft })
    await activeWorkoutStorage.saveDraft(newDraft)
  }

  return {
    draft: null,
    isLoading: false,
    isCorrupted: false,
    corruptedRaw: '',
    error: null,

    restoreDraft: async () => {
      set({ isLoading: true, error: null })
      const result = await activeWorkoutStorage.loadDraft()
      if (result.status === 'success') {
        set({ draft: result.draft, isLoading: false, isCorrupted: false, corruptedRaw: '' })
      } else if (result.status === 'corrupted') {
        set({
          isLoading: false,
          isCorrupted: true,
          corruptedRaw: result.raw,
          draft: null,
        })
      } else {
        set({
          isLoading: false,
          error: result.message,
          draft: null,
        })
      }
    },

    startWorkout: async () => {
      const now = new Date().toISOString()
      const newDraft: ActiveWorkoutDraft = {
        version: 1,
        id: generateUuid(),
        startedAt: now,
        updatedAt: now,
        exercises: [],
      }

      set({ draft: newDraft, isCorrupted: false, corruptedRaw: '', error: null })
      await activeWorkoutStorage.saveDraft(newDraft)
    },

    addExercise: async (exerciseId, name, type) => {
      await updateAndPersist((draft) => {
        // Prevent duplicate exercises in the same workout to keep the workout focused and prevent duplicate entry accidents.
        const exists = draft.exercises.some((e) => e.exerciseId === exerciseId)
        if (exists) {
          return draft
        }

        const newExercise: ActiveWorkoutExercise = {
          draftExerciseId: generateLocalId('exercise'),
          exerciseId,
          exerciseName: name,
          exerciseType: type,
          sets: [],
        }

        return {
          ...draft,
          exercises: [...draft.exercises, newExercise],
        }
      })
    },

    removeExercise: async (draftExerciseId) => {
      await updateAndPersist((draft) => ({
        ...draft,
        exercises: draft.exercises.filter((e) => e.draftExerciseId !== draftExerciseId),
      }))
    },

    addSet: async (draftExerciseId, setFields) => {
      await updateAndPersist((draft) => {
        const now = new Date().toISOString()
        const newSet: ActiveWorkoutSet = {
          ...setFields,
          draftSetId: generateLocalId('set'),
          createdAt: now,
          updatedAt: now,
        }

        return {
          ...draft,
          exercises: draft.exercises.map((e) => {
            if (e.draftExerciseId !== draftExerciseId) return e
            return {
              ...e,
              sets: [...e.sets, newSet],
            }
          }),
        }
      })
    },

    updateSet: async (draftExerciseId, draftSetId, setUpdates) => {
      await updateAndPersist((draft) => {
        const now = new Date().toISOString()
        return {
          ...draft,
          exercises: draft.exercises.map((e) => {
            if (e.draftExerciseId !== draftExerciseId) return e
            return {
              ...e,
              sets: e.sets.map((s) => {
                if (s.draftSetId !== draftSetId) return s
                return {
                  ...s,
                  ...setUpdates,
                  updatedAt: now,
                }
              }),
            }
          }),
        }
      })
    },

    deleteSet: async (draftExerciseId, draftSetId) => {
      await updateAndPersist((draft) => ({
        ...draft,
        exercises: draft.exercises.map((e) => {
          if (e.draftExerciseId !== draftExerciseId) return e
          return {
            ...e,
            sets: e.sets.filter((s) => s.draftSetId !== draftSetId),
          }
        }),
      }))
    },

    discardWorkout: async () => {
      set({ draft: null, isCorrupted: false, corruptedRaw: '', error: null })
      await activeWorkoutStorage.clearDraft()
    },

    clearWorkout: async () => {
      set({ draft: null, isCorrupted: false, corruptedRaw: '', error: null })
      await activeWorkoutStorage.clearDraft()
    },
  }
})
