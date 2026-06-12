import {
  type DeleteWorkoutResponse,
  DeleteWorkoutResponseSchema,
  type DeleteWorkoutSetResponse,
  DeleteWorkoutSetResponseSchema,
  type UpdateWorkoutSetRequest,
  UpdateWorkoutSetRequestSchema,
  type UpdateWorkoutSetResponse,
  UpdateWorkoutSetResponseSchema,
} from '@gymnotebook/contracts'
import { mobileApiClient } from '@/features/auth/api/mobile-auth-api'
import { normalizeApiError } from '@/shared/api/errors'
import { HistoryApiError } from './history-api'

export const historyMutationsApi = {
  /**
   * Updates an existing workout set.
   * Weight is in grams in the payload.
   */
  async updateWorkoutSet(
    setId: number,
    payload: UpdateWorkoutSetRequest,
  ): Promise<UpdateWorkoutSetResponse> {
    try {
      const validatedPayload = UpdateWorkoutSetRequestSchema.parse(payload)
      const response = await mobileApiClient.patch(`/workout/sets/${setId}`, validatedPayload)
      return UpdateWorkoutSetResponseSchema.parse(response.data)
    } catch (error) {
      throw new HistoryApiError(normalizeApiError(error))
    }
  },

  /**
   * Deletes an existing workout set.
   */
  async deleteWorkoutSet(setId: number): Promise<DeleteWorkoutSetResponse> {
    try {
      const response = await mobileApiClient.delete(`/workout/sets/${setId}`)
      return DeleteWorkoutSetResponseSchema.parse(
        response.data === '' || response.data === undefined ? null : response.data,
      )
    } catch (error) {
      throw new HistoryApiError(normalizeApiError(error))
    }
  },

  /**
   * Deletes a complete saved workout.
   */
  async deleteWorkout(workoutId: number): Promise<DeleteWorkoutResponse> {
    try {
      const response = await mobileApiClient.delete(`/workout/${workoutId}`)
      return DeleteWorkoutResponseSchema.parse(
        response.data === '' || response.data === undefined ? null : response.data,
      )
    } catch (error) {
      throw new HistoryApiError(normalizeApiError(error))
    }
  },
}
