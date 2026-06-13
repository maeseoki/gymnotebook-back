import type { WorkoutHistoryPage } from '@gymnotebook/contracts'
import { computeExerciseStats } from '../src/features/exercises/utils/exercise-stats'

describe('computeExerciseStats helper', () => {
  const emptyHistory: WorkoutHistoryPage = {
    content: [],
    totalElements: 0,
    totalPages: 0,
    page: 0,
    pageSize: 20,
  }

  it('returns null when there is no history', () => {
    expect(computeExerciseStats(emptyHistory, 'WEIGHT_REPS')).toBeNull()
  })

  it('correctly calculates stats for WEIGHT_REPS exercise type', () => {
    const history: WorkoutHistoryPage = {
      content: [
        {
          id: 1,
          startDate: '2026-06-11T12:00:00Z',
          endDate: '2026-06-11T13:00:00Z',
          exercise: {
            id: 1,
            name: 'Bench Press',
            type: 'WEIGHT_REPS',
            primaryMuscleGroup: 'CHEST',
          },
          sets: [
            {
              id: 101,
              reps: 8,
              weight: 82500, // 82.5 kg
              time: 0,
              distance: 0,
              isDropSet: false,
            },
            {
              id: 102,
              reps: 10,
              weight: 70000, // 70 kg
              time: 0,
              distance: 0,
              isDropSet: false,
            },
          ],
        },
        {
          id: 2,
          startDate: '2026-06-12T15:00:00Z',
          endDate: '2026-06-12T16:00:00Z',
          exercise: {
            id: 1,
            name: 'Bench Press',
            type: 'WEIGHT_REPS',
            primaryMuscleGroup: 'CHEST',
          },
          sets: [
            {
              id: 103,
              reps: 6,
              weight: 90000, // 90 kg
              time: 0,
              distance: 0,
              isDropSet: false,
            },
          ],
        },
      ],
      totalElements: 2,
      totalPages: 1,
      page: 0,
      pageSize: 20,
    }

    const stats = computeExerciseStats(history, 'WEIGHT_REPS')
    expect(stats).not.toBeNull()
    if (stats) {
      // 12 jun 2026 is the most recent
      // Note: toLocaleDateString might add dot depending on environment, formatStatsDate handles replace('.')
      // Let's assert values
      expect(stats.totalSeries).toBe(3)
      expect(stats.mejorPeso).toBe('90 kg')
      // Volume = weightKg * reps
      // Set 101: 82.5 * 8 = 660 kg
      // Set 102: 70 * 10 = 700 kg
      // Set 103: 90 * 6 = 540 kg
      // Best volume is 700 kg
      expect(stats.mejorVolumen).toBe('700 kg')
      expect(stats.ultimaVez).toContain('2026')
      expect(stats.ultimaVez).toContain('12')
      expect(stats.mejorTiempo).toBeUndefined()
      expect(stats.mejorDistancia).toBeUndefined()
    }
  })

  it('correctly calculates stats for TIME_DISTANCE exercise type', () => {
    const history: WorkoutHistoryPage = {
      content: [
        {
          id: 1,
          startDate: '2026-06-11T12:00:00Z',
          endDate: '2026-06-11T13:00:00Z',
          exercise: { id: 2, name: 'Running', type: 'TIME_DISTANCE', primaryMuscleGroup: 'CARDIO' },
          sets: [
            {
              id: 201,
              reps: 0,
              weight: 0,
              time: 90, // 1m 30s
              distance: 2000,
              isDropSet: false,
            },
            {
              id: 202,
              reps: 0,
              weight: 0,
              time: 45, // 45s
              distance: 1000,
              isDropSet: false,
            },
          ],
        },
      ],
      totalElements: 1,
      totalPages: 1,
      page: 0,
      pageSize: 20,
    }

    const stats = computeExerciseStats(history, 'TIME_DISTANCE')
    expect(stats).not.toBeNull()
    if (stats) {
      expect(stats.totalSeries).toBe(2)
      expect(stats.mejorTiempo).toBe('1m 30s')
      expect(stats.mejorDistancia).toBe('2000 m')
      expect(stats.mejorPeso).toBeUndefined()
      expect(stats.mejorVolumen).toBeUndefined()
    }
  })

  it('correctly converts 82500 grams to 82.5 kg', () => {
    const history: WorkoutHistoryPage = {
      content: [
        {
          id: 1,
          startDate: '2026-06-11T12:00:00Z',
          endDate: '2026-06-11T13:00:00Z',
          exercise: { id: 1, name: 'Bench Press', type: 'WEIGHT', primaryMuscleGroup: 'CHEST' },
          sets: [
            {
              id: 101,
              reps: 0,
              weight: 82500, // 82.5 kg
              time: 0,
              distance: 0,
              isDropSet: false,
            },
          ],
        },
      ],
      totalElements: 1,
      totalPages: 1,
      page: 0,
      pageSize: 20,
    }

    const stats = computeExerciseStats(history, 'WEIGHT')
    expect(stats).not.toBeNull()
    if (stats) {
      expect(stats.mejorPeso).toBe('82.5 kg')
    }
  })
})
