import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button } from '@chakra-ui/react'
import { ExerciseDetailModalProps } from '../../types.d'
import ExerciseDetail from '../Exercises/ExerciseDetail'

export default function ExerciseDetailModal ({ isOpen, onClose, exerciseId }: ExerciseDetailModalProps) {
  return (
    <Modal onClose={onClose} isOpen={isOpen} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader />
        <ModalCloseButton />
        <ModalBody>
          <ExerciseDetail exerciseId={exerciseId} />
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
