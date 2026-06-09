import { Workout } from '../types'
import { apiClient } from '../utils/apiClient'

export const getAllWorkouts = async (): Promise<Workout[]> => {
  const response = await apiClient.get('workout')
  return response.data
}

export const saveWorkout = async (workout: Workout): Promise<void> => {
  const response = await apiClient.post('workout', workout)
  return response.data
}

export const getWorkoutDaysForMonth = async (month: number, year: number): Promise<number[]> => {
  const response = await apiClient.get(`workout/days/${month}/${year}`)
  return response.data
}

export const getWorkoutsByDate = async (date: Date): Promise<Workout[]> => {
  const response = await apiClient.get(`workout/workouts/${date.toISOString()}`)
  return response.data
}
