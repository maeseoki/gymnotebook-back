import { ExerciseType, ExerciseTypeUpdate } from '../types.d'
import { apiClient } from '../utils/apiClient'

export const getAllExercises = async (): Promise<ExerciseType[]> => {
  const response = await apiClient.get('exercise')
  return response.data
}

export const getExercise = async (id: number): Promise<ExerciseType> => {
  const response = await apiClient.get(`exercise/${id}`)
  return response.data
}

export const createExercise = async (exercise: ExerciseType): Promise<void> => {
  const response = await apiClient.post('exercise', exercise)
  return response.data
}

export const updateExercise = async (exercise: ExerciseTypeUpdate): Promise<ExerciseType> => {
  const response = await apiClient.put(`exercise/${exercise.id}`, exercise)
  return response.data
}

export const deleteExercise = async (id: number): Promise<void> => {
  await apiClient.delete(`exercise/${id}`)
}
