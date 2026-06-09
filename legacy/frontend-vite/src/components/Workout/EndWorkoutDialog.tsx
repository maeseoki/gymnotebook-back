import { AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter, Button } from '@chakra-ui/react'
import { EndWorkoutDialogProps } from '../../types'

export default function EndWorkoutDialog ({ isEndOpen, onEndClose, endRef, confirmEndWorkout }: EndWorkoutDialogProps) {
  return (
    <>
      <AlertDialog
        isOpen={isEndOpen}
        leastDestructiveRef={endRef}
        onClose={onEndClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize='lg' fontWeight='bold'>
              Terminar Workout
            </AlertDialogHeader>

            <AlertDialogBody>
              ¿Estás seguro? Una vez terminado, no podrás añadir más ejercicios.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={endRef} onClick={onEndClose}>
                Cancelar
              </Button>
              <Button colorScheme='green' onClick={confirmEndWorkout} ml={3}>
                Terminar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  )
}
