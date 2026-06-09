import { Button, Heading, Flex, chakra } from '@chakra-ui/react'
import { useContext } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { WorkoutContext } from '../../context/WorkoutContext'

export default function NoWorkout () {
  const { setWorkout } = useContext(WorkoutContext)

  const startWorkout = () => {
    // Creamos un nuevo workout con un UUID aleatorio y la fecha actual.
    const newWorkout = {
      uuid: crypto.randomUUID(),
      startDate: new Date()
    }
    setWorkout(newWorkout)
  }

  return (
    <Flex gap={4} direction='column'>
      <Heading
        as='h2'
        size='lg'
        textAlign='center'
        my={4}
      >¿Preparado para <chakra.strong color='primary.200'>darlo todo?</chakra.strong>
      </Heading>
      <Button
        variant='secondaryGradient'
        size='lg'
        onClick={startWorkout}
      >¡Entrenar!
      </Button>
      <Heading
        as='h2'
        size='lg'
        mt={12}
        textAlign='center'
      >Ejercios y entrenos
      </Heading>
      <Flex gap={4} mt={4} justifyContent='space-evenly'>
        <Button variant='primaryGradient' as={RouterLink} to='/exercises'>Mis Ejercicios</Button>
        <Button variant='primaryGradient' as={RouterLink} to='/me'>Mis Entrenamientos</Button>
      </Flex>
    </Flex>
  )
}
