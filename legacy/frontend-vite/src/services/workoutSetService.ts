import { WorkoutSetsPageResponse } from '../types'
import { apiClient } from '../utils/apiClient'

export const getWorkoutSetsByExerciseId = async (exerciseId: number, _pageNumer = 0, _pageSize = 10, _orderBy = 'startDate', _order = 'desc'): Promise<WorkoutSetsPageResponse> => {
  const response = await apiClient.get(`workout-sets/exercise/${exerciseId}`, {
    params: {
      page: _pageNumer,
      size: _pageSize,
      sort: `${_orderBy},${_order}`
    }
  })
  return response.data
}
