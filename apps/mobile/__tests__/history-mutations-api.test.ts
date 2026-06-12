import { AxiosError } from 'axios'
import { HistoryApiError } from '../src/features/history/api/history-api'
import { historyMutationsApi } from '../src/features/history/api/history-mutations-api'

jest.mock('@/features/auth/api/mobile-auth-api', () => {
  return {
    mobileApiClient: {
      patch: jest.fn(),
      delete: jest.fn(),
    },
  }
})

import { mobileApiClient } from '@/features/auth/api/mobile-auth-api'

const mockPatch = mobileApiClient.patch as jest.Mock
const mockDelete = mobileApiClient.delete as jest.Mock

describe('History Mutations API wrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('updateWorkoutSet', () => {
    it('sends weight in grams and parses successful update response', async () => {
      const mockResponse = {
        id: 123,
        reps: 10,
        weight: 82500, // 82.5 kg in grams
        time: 90,
        distance: 200,
        notes: 'Updated set note',
        isDropSet: true,
      }
      mockPatch.mockResolvedValue({ data: mockResponse })

      const result = await historyMutationsApi.updateWorkoutSet(123, {
        reps: 10,
        weight: 82500,
        time: 90,
        distance: 200,
        notes: 'Updated set note',
        isDropSet: true,
      })

      expect(result).toEqual(mockResponse)
      expect(mockPatch).toHaveBeenCalledWith('/workout/sets/123', {
        reps: 10,
        weight: 82500,
        time: 90,
        distance: 200,
        notes: 'Updated set note',
        isDropSet: true,
      })
    })

    it('handles api errors by throwing HistoryApiError', async () => {
      mockPatch.mockRejectedValue(new AxiosError('Validation/API Error'))
      await expect(historyMutationsApi.updateWorkoutSet(123, { reps: 10 })).rejects.toThrow(
        HistoryApiError,
      )
    })
  })

  describe('deleteWorkoutSet', () => {
    it('successfully calls delete workout set endpoint', async () => {
      mockDelete.mockResolvedValue({ data: null })

      const result = await historyMutationsApi.deleteWorkoutSet(123)

      expect(result).toBeNull()
      expect(mockDelete).toHaveBeenCalledWith('/workout/sets/123')
    })

    it('accepts empty 204 delete workout set responses', async () => {
      mockDelete.mockResolvedValueOnce({ data: undefined })

      await expect(historyMutationsApi.deleteWorkoutSet(123)).resolves.toBeNull()

      mockDelete.mockResolvedValueOnce({ data: '' })

      await expect(historyMutationsApi.deleteWorkoutSet(123)).resolves.toBeNull()
    })

    it('handles errors by throwing HistoryApiError', async () => {
      mockDelete.mockRejectedValue(new AxiosError('Network Error'))

      await expect(historyMutationsApi.deleteWorkoutSet(123)).rejects.toThrow(HistoryApiError)
    })
  })

  describe('deleteWorkout', () => {
    it('successfully calls delete workout endpoint', async () => {
      mockDelete.mockResolvedValue({ data: null })

      const result = await historyMutationsApi.deleteWorkout(456)

      expect(result).toBeNull()
      expect(mockDelete).toHaveBeenCalledWith('/workout/456')
    })

    it('accepts empty 204 delete workout responses', async () => {
      mockDelete.mockResolvedValueOnce({ data: undefined })

      await expect(historyMutationsApi.deleteWorkout(456)).resolves.toBeNull()

      mockDelete.mockResolvedValueOnce({ data: '' })

      await expect(historyMutationsApi.deleteWorkout(456)).resolves.toBeNull()
    })

    it('handles errors by throwing HistoryApiError', async () => {
      mockDelete.mockRejectedValue(new AxiosError('Network Error'))

      await expect(historyMutationsApi.deleteWorkout(456)).rejects.toThrow(HistoryApiError)
    })

    it('handles errors by throwing HistoryApiError', async () => {
      mockDelete.mockRejectedValue(new AxiosError('Network Error'))
      await expect(historyMutationsApi.deleteWorkout(456)).rejects.toThrow(HistoryApiError)
    })
  })
})
