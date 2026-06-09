import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, FormControl, FormLabel, Input, ModalFooter, Button, Switch, Icon, Flex } from '@chakra-ui/react'
import { BsLightningChargeFill } from 'react-icons/bs'
import { AddSetModalProps, ExerciseTypeType, SetType } from '../../types.d'
import { useEffect, useState } from 'react'

export default function AddSetModal ({ isOpen, onClose, currentWorkoutSet, onAccept }: AddSetModalProps) {
  const [isDropSet, setIsDropSet] = useState(false)
  const [set, setSet] = useState<Partial<SetType>>({})

  const handleChanges = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numberFields = ['reps', 'weight', 'time', 'distance']
    const { name, value } = e.target

    // Si el campo es un número, lo parseamos a number.
    if (numberFields.includes(name)) {
      setSet({ ...set, [e.target.name]: Number(e.target.value) })
      return
    }

    // Si no, lo dejamos como string.
    setSet({ ...set, [name]: value })
  }

  const handleSubmit = () => {
    const newSet: SetType = { ...set, isDropSet, startDate: new Date() }
    onAccept(newSet)
  }

  useEffect(() => {
    setSet({})
    setIsDropSet(false)
  }, [isOpen])

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Añadir Serie</ModalHeader>
        <ModalCloseButton />
        <ModalBody display='flex' flexDir='column' gap={4}>
          {currentWorkoutSet && currentWorkoutSet.exercise.type === ExerciseTypeType.WEIGHT && (
            <FormControl>
              <FormLabel>Peso</FormLabel>
              <Input
                name='weight'
                placeholder='32Kg'
                value={set.weight ?? ''}
                onChange={handleChanges}
              />
            </FormControl>
          )}
          {currentWorkoutSet && currentWorkoutSet.exercise.type === ExerciseTypeType.REPS && (
            <FormControl>
              <FormLabel>Repeticiones</FormLabel>
              <Input
                name='reps'
                placeholder='Repeticiones'
                value={set.reps ?? ''}
                onChange={handleChanges}
              />
            </FormControl>
          )}
          {currentWorkoutSet && currentWorkoutSet.exercise.type === ExerciseTypeType.TIME && (
            <FormControl>
              <FormLabel>Tiempo</FormLabel>
              <Input
                name='time'
                placeholder='Tiempo'
                value={set.time ?? ''}
                onChange={handleChanges}
              />
            </FormControl>
          )}
          {currentWorkoutSet && currentWorkoutSet.exercise.type === ExerciseTypeType.DISTANCE && (
            <FormControl>
              <FormLabel>Distancia</FormLabel>
              <Input
                name='distance'
                placeholder='Distancia'
                value={set.distance ?? ''}
                onChange={handleChanges}
              />
            </FormControl>
          )}
          {currentWorkoutSet && currentWorkoutSet.exercise.type === ExerciseTypeType.WEIGHT_REPS && (
            <>
              <FormControl>
                <FormLabel>Peso</FormLabel>
                <Input
                  name='weight'
                  placeholder='Peso'
                  value={set.weight ?? ''}
                  onChange={handleChanges}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Repeticiones</FormLabel>
                <Input
                  name='reps'
                  placeholder='Repeticiones'
                  value={set.reps ?? ''}
                  onChange={handleChanges}
                />
              </FormControl>
            </>
          )}
          {currentWorkoutSet && currentWorkoutSet.exercise.type === ExerciseTypeType.TIME_DISTANCE && (
            <>
              <FormControl>
                <FormLabel>Tiempo</FormLabel>
                <Input
                  name='time'
                  placeholder='Tiempo'
                  value={set.time ?? ''}
                  onChange={handleChanges}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Distancia</FormLabel>
                <Input
                  name='distance'
                  placeholder='Distancia'
                  value={set.distance ?? ''}
                  onChange={handleChanges}
                />
              </FormControl>
            </>
          )}
          <FormControl>
            <FormLabel>Notas</FormLabel>
            <Input
              name='notes'
              placeholder='Notas'
              value={set.notes ?? ''}
              onChange={handleChanges}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Es un "Drop Set"</FormLabel>
            <Flex flexDir='row' alignItems='center' mb={4}>
              <Switch
                id='isDropSet'
                size='lg'
                colorScheme='primary'
                onChange={() => setIsDropSet(!isDropSet)}
              />
              <Icon
                as={BsLightningChargeFill}
                variant={isDropSet ? 'lightning' : 'off'}
                boxSize={6}
                ms={4}
              />
            </Flex>
          </FormControl>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme='primary' mr={3} onClick={handleSubmit}>
            Aceptar
          </Button>
          <Button variant='ghost' onClick={onClose}>Cancelar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
