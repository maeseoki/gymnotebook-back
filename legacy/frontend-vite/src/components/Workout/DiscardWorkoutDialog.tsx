import { AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter, Button } from '@chakra-ui/react'
import { DiscardWorkoutDialogProps } from '../../types'

export default function DiscardWorkoutDialog ({ isDiscardOpen, onDiscardClose, discardRef, confirmDiscardWorkout }: DiscardWorkoutDialogProps) {
  return (
    <>
      <AlertDialog
        isOpen={isDiscardOpen}
        leastDestructiveRef={discardRef}
        onClose={onDiscardClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize='lg' fontWeight='bold'>
              Descartar Workout
            </AlertDialogHeader>

            <AlertDialogBody>
              ¿Estás seguro? Todos los datos del workout se perderán.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={discardRef} onClick={onDiscardClose}>
                Cancelar
              </Button>
              <Button colorScheme='red' onClick={confirmDiscardWorkout} ml={3}>
                Descartar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  )
}
