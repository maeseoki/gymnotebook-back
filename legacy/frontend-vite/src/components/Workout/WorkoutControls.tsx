import { Button, Flex, useToast } from '@chakra-ui/react'
import { useContext, useRef, useState } from 'react'
import { IoMdAdd, IoMdClose, IoMdCheckmark } from 'react-icons/io'
import { WorkoutContext } from '../../context/WorkoutContext'
import DiscardWorkoutDialog from './DiscardWorkoutDialog'
import EndWorkoutDialog from './EndWorkoutDialog'
import { GenericResponse, WorkoutControlsProps } from '../../types'
import { saveWorkout } from '../../services/workoutService'
import confetti from 'canvas-confetti'
import { AxiosError } from 'axios'

export default function WorkoutControls ({ setIsAddingExercise }: WorkoutControlsProps) {
  const { workout, setWorkout } = useContext(WorkoutContext)
  const [isDiscardOpen, setIsDiscardOpen] = useState(false)
  const [isEndOpen, setIsEndOpen] = useState(false)
  const toast = useToast()
  const discardRef = useRef<HTMLButtonElement>(null)
  const endRef = useRef<HTMLButtonElement>(null)

  // Cierra el modal de descartar workout
  const onDiscardClose = () => setIsDiscardOpen(false)

  // Abre el modal de descartar workout
  const handleDiscardWorkout = async () => {
    setIsDiscardOpen(true)
  }

  // Confirma el descarte del workout
  const confirmDiscardWorkout = async () => {
    setWorkout(null)
    toast({
      title: 'Workout descartado',
      description: 'El workout ha sido descartado',
      status: 'success'
    })
    setIsDiscardOpen(false)
  }

  // Cierra el modal de terminar workout
  const onEndClose = () => setIsEndOpen(false)

  // Abre el modal de terminar workout
  const handleEndWorkout = async () => {
    setIsEndOpen(true)
  }

  // Confirma el termino del workout
  const confirmEndWorkout = async () => {
    if (!workout) return
    workout.endDate = new Date()
    try {
      await saveWorkout(workout)
      setIsEndOpen(false)
      toast({
        title: '¡Genial!',
        description: 'Apunta a la luna, si fallas, darás entre las estrellas!!',
        status: 'success'
      })
      void confetti()
      setWorkout(null)
    } catch (error) {
      // Workout con ese uuid ya existe
      const axiosError = error as AxiosError<GenericResponse>
      if (axiosError.response?.status === 409) {
        toast({
          title: 'Error al guardar el workout',
          description: 'Ya existe ese workout en la base de datos',
          status: 'error'
        })
        setWorkout(null)
      }
      // Error desconocido
      toast({
        title: 'Error al guardar el workout',
        description: 'Ha ocurrido un error al guardar el workout',
        status: 'error'
      })
      console.error('Failed to end workout', error)
      onEndClose()
    }
  }

  return (
    <>
      <Flex
        direction='column'
        alignItems='center'
        gap={6}
        mt='auto'
        mb={4}
      >
        <Button
          size='lg'
          variant='primaryGradient'
          leftIcon={<IoMdAdd />}
          onClick={setIsAddingExercise}
        >Añadir ejercicio
        </Button>
        <Flex justifyContent='space-between' gap={4}>
          <Button
            size='lg'
            colorScheme='green'
            variant='outline'
            leftIcon={<IoMdCheckmark />}
            onClick={handleEndWorkout}
          >Terminar
          </Button>
          <Button
            size='lg'
            colorScheme='red'
            variant='outline'
            leftIcon={<IoMdClose />}
            onClick={async () => await handleDiscardWorkout()}
          >Descartar
          </Button>
        </Flex>
      </Flex>
      <DiscardWorkoutDialog
        isDiscardOpen={isDiscardOpen}
        onDiscardClose={onDiscardClose}
        discardRef={discardRef}
        confirmDiscardWorkout={confirmDiscardWorkout}
      />
      <EndWorkoutDialog
        isEndOpen={isEndOpen}
        onEndClose={onEndClose}
        endRef={endRef}
        confirmEndWorkout={confirmEndWorkout}
      />
    </>
  )
}
