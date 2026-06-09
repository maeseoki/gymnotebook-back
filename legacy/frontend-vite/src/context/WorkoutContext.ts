
import { createContext } from 'react'
import { WorkoutState } from '../types'

const defaultState: WorkoutState = {
  workout: null,
  setWorkout: () => { throw new Error('La función setWorkout debe ser sobreescrita') }
}

export const WorkoutContext = createContext<WorkoutState>(defaultState)
