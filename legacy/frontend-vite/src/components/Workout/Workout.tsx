import { useContext, useState } from 'react'
import { WorkoutContext } from '../../context/WorkoutContext'
import NoWorkout from './NoWorkout'
import WorkoutInfo from './WorkoutInfo'
import { Flex, Heading } from '@chakra-ui/react'
import WorkoutControls from './WorkoutControls'
import { ExerciseTypeWithImage, WorkoutSet } from '../../types'
import Exercises from '../Exercises/Exercises'
import WorkoutSets from './WorkoutSets'

export default function Workout () {
  const { workout, setWorkout } = useContext(WorkoutContext)
  const [isAddingExercise, setIsAddingExercise] = useState(false)

  if (!workout) return <NoWorkout />

  const handleExerciseClick = (exercise: ExerciseTypeWithImage) => {
    const workoutSet: WorkoutSet = {
      exercise,
      startDate: new Date(),
      sets: []
    }

    setWorkout({
      ...workout,
      workoutSets: [...(workout.workoutSets ?? []), workoutSet]
    })

    setIsAddingExercise(false)
  }

  // Si se está añadiendo un ejercicio, mostramos la lista de ejercicios.
  if (isAddingExercise) return <Exercises onExerciseClick={handleExerciseClick} />

  return (
    <Flex direction='column' minH='calc(100vh - 8rem)'>
      <Heading as='h2' textAlign='center' my={4}>¡Workout en marcha!</Heading>
      <WorkoutInfo />
      <WorkoutSets />
      <WorkoutControls setIsAddingExercise={setIsAddingExercise} />
    </Flex>
  )
}
