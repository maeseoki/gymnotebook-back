import { Box, Flex, Text } from '@chakra-ui/react'
import { WorkoutContext } from '../../context/WorkoutContext'
import { useContext, useEffect, useState } from 'react'

export default function WorkoutInfo () {
  const { workout } = useContext(WorkoutContext)
  const [duration, setDuration] = useState({ minutes: 0, seconds: 0 })

  // Calculamos los sets totales. Si no hay sets, devolvemos 0 (es el último nullish coalescing).
  const totalSets = workout?.workoutSets?.reduce((acc, curr) => acc + (curr.sets?.length ?? 0), 0) ?? 0

  useEffect(() => {
    if (!workout) return

    // Cada segundo, actualizamos la duración del workout.
    const workoutStartTime = new Date(workout.startDate)
    const intervalId = setInterval(() => {
      const currentTime = new Date()
      const durationMinutes = Math.floor((currentTime.getTime() - workoutStartTime.getTime()) / 60000)
      const durationSeconds = Math.floor(((currentTime.getTime() - workoutStartTime.getTime()) % 60000) / 1000)
      setDuration({ minutes: durationMinutes, seconds: durationSeconds })
    }, 1000)

    return () => clearInterval(intervalId)
  }, [workout])

  return (
    <Flex
      gap={4}
      justifyContent='space-between'
      shadow='md'
      borderWidth='1px'
      borderRadius='lg'
      bgColor='gray.700'
    >
      <Box p={5} textAlign='center'>
        <Text fontSize='md'>Duración</Text>
        <Text fontSize='xl' color='primary.400'>{`${duration.minutes}m ${duration.seconds}s`}</Text>
      </Box>
      <Box p={5} textAlign='center'>
        <Text fontSize='md'>Ejercicios</Text>
        <Text fontSize='xl' color='primary.400'>{workout?.workoutSets?.length ?? 0}</Text>
      </Box>
      <Box p={5} textAlign='center'>
        <Text fontSize='md'>Series</Text>
        <Text fontSize='xl' color='primary.400'>{totalSets}</Text>
      </Box>
    </Flex>
  )
}
