import { type WorkoutResponse, WorkoutResponseSchema } from '@gymnotebook/contracts'
import { z } from 'zod'
import { mobileApiClient } from '@/features/auth/api/mobile-auth-api'
import { type ApiFailure, normalizeApiError } from '@/shared/api/errors'

export class HistoryApiError extends Error {
  constructor(readonly failure: ApiFailure) {
    super(failure.message)
    this.name = 'HistoryApiError'
  }
}

export const historyApi = {
  /**
   * Fetches the calendar day numbers containing workouts for a given month and year.
   */
  async getWorkoutDays(month: number, year: number, timezone?: string): Promise<number[]> {
    try {
      const response = await mobileApiClient.get(`/workout/days/${month}/${year}`, {
        params: timezone ? { timezone } : undefined,
      })
      return z.array(z.number().int().min(1).max(31)).parse(response.data)
    } catch (error) {
      throw new HistoryApiError(normalizeApiError(error))
    }
  },

  /**
   * Fetches all workouts saved for a specific local calendar date.
   */
  async getWorkoutsByDate(date: string, timezone?: string): Promise<WorkoutResponse[]> {
    try {
      const response = await mobileApiClient.get(`/workout/workouts/${date}`, {
        params: timezone ? { timezone } : undefined,
      })
      return z.array(WorkoutResponseSchema).parse(response.data)
    } catch (error) {
      throw new HistoryApiError(normalizeApiError(error))
    }
  },
}
