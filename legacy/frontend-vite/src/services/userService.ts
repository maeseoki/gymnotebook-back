import { userResponse } from '../types'
import { apiClient } from '../utils/apiClient'

export const getAllUsers = async (): Promise<userResponse[]> => {
  const response = await apiClient.get('user')
  return response.data
}

export const deleteUser = async (id: number): Promise<void> => {
  await apiClient.delete(`user/${id}`)
}
