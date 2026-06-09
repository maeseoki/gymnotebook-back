import { Card, Button, Box, Heading, Text, Flex, CardHeader, IconButton, Avatar, Icon, HStack, CardBody, CardFooter, useDisclosure, Table, Tbody } from '@chakra-ui/react'
import { Fragment, useContext, useState } from 'react'
import { WorkoutContext } from '../../context/WorkoutContext'
import { GiBiceps } from 'react-icons/gi'
import { GoGraph } from 'react-icons/go'
import { muscleGroupNames } from '../../utils/maps'
import { IoMdAdd } from 'react-icons/io'
import { WorkoutSet, SetType, Workout } from '../../types'
import AddSetModal from './AddSetModal'
import Set from './Set'
import SetsTableHead from './SetsTableHead'
import ExerciseDetailModal from './ExerciseDetailModal'

export default function WorkoutSets () {
  const { workout, setWorkout } = useContext(WorkoutContext)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { isOpen: isOpenDetail, onOpen: onOpenDetail, onClose: onCloseDetail } = useDisclosure()
  const [currentWorkoutSet, setCurrentWorkoutSet] = useState<WorkoutSet | null>(null)
  const [selectedExerciseId, setSelectedExerciseId] = useState(0)

  const handleAddSet = (workoutSet: WorkoutSet) => {
    setCurrentWorkoutSet(workoutSet)
    onOpen()
  }

  const onOpenDetailModal = (exerciseId: number) => {
    setSelectedExerciseId(exerciseId)
    onOpenDetail()
  }

  const handleAccept = (newSet: SetType) => {
    setWorkout((prevWorkout: Workout) => {
      if (!prevWorkout.workoutSets) {
        return prevWorkout
      }

      // Obtenemos el índice del workoutSet al que añadir el nuevo set
      const workoutSetIndex = prevWorkout.workoutSets.findIndex(workoutSet => workoutSet === currentWorkoutSet)

      // Si no se encuentra el workoutSet, devolvemos el workout sin modificar
      if (workoutSetIndex === -1) {
        return prevWorkout
      }

      // Clonamos el array de workoutSets
      const updatedWorkoutSets = [...prevWorkout.workoutSets]
      const updatedWorkoutSet = updatedWorkoutSets[workoutSetIndex]

      if (updatedWorkoutSet) {
        // Añadimos el nuevo set al array de sets
        updatedWorkoutSet.sets = updatedWorkoutSet.sets ? [...updatedWorkoutSet.sets, newSet] : [newSet]
        // Actualizamos el workoutSet en el array de workoutSets
        updatedWorkoutSets[workoutSetIndex] = updatedWorkoutSet
      }

      return { ...prevWorkout, workoutSets: updatedWorkoutSets }
    })

    onClose()
  }

  // Devolvemos null si no hay workout o workoutSets
  if (!workout?.workoutSets) {
    return null
  }

  return (
    <Flex
      flexDir='column'
      gap={8}
      mt={4}
      mb={8}
    >
      {workout.workoutSets.map((workoutSet, index) => (
        <Fragment key={index}>
          <Card
            shadow='md'
            borderWidth='1px'
            borderColor='whiteAlpha.300'
          >
            <CardHeader borderBottomWidth='1px' pb={2}>
              <Flex gap='4'>
                <Flex
                  flex='1'
                  gap='4'
                  alignItems='center'
                  flexWrap='wrap'
                >
                  {workoutSet.exercise.imageId
                    ? (
                      <Avatar
                        name={workoutSet.exercise.name}
                        src={`${import.meta.env.VITE_API_URL as string}image/${workoutSet.exercise.imageId ?? ''}`}
                      />
                      )
                    : (
                      <Avatar
                        name={workoutSet.exercise.name}
                        src={workoutSet.exercise.imageUrl}
                      />
                      )}
                  <Box>
                    <Heading size='sm'>{workoutSet.exercise.name}</Heading>
                    <HStack>
                      <Icon as={GiBiceps} />
                      <Text>{muscleGroupNames[workoutSet.exercise.primaryMuscleGroup]}
                        {workoutSet.exercise.secondaryMuscleGroup ? ', ' + muscleGroupNames[workoutSet.exercise.secondaryMuscleGroup] : ''}
                      </Text>
                    </HStack>
                  </Box>
                </Flex>
                <IconButton
                  variant='outline'
                  colorScheme='primary'
                  aria-label='Progreso'
                  icon={<GoGraph />}
                  onClick={() => onOpenDetailModal(workoutSet.exercise.id ?? 0)}
                />
              </Flex>
            </CardHeader>
            <CardBody>
              <Box mt={4}>
                <Table>
                  <SetsTableHead exerciseType={workoutSet.exercise.type} />
                  <Tbody>
                    {workoutSet.sets?.map((set, i) => (
                      <Set
                        key={i}
                        index={i}
                        reps={set.reps}
                        weight={set.weight}
                        time={set.time}
                        distance={set.distance}
                        isDropSet={set.isDropSet}
                        exerciseType={workoutSet.exercise.type}
                        startDate={set.startDate}
                      />
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </CardBody>
            <CardFooter pt={2}>
              <Box
                w='full'
                mt={4}
                mb={-8}
                textAlign='center'
              >
                <Button
                  variant='solid'
                  colorScheme='secondary'
                  size='md'
                  leftIcon={<IoMdAdd />}
                  onClick={() => handleAddSet(workoutSet)}
                >
                  Añadir Serie
                </Button>
              </Box>
            </CardFooter>
          </Card>
        </Fragment>
      ))}

      <ExerciseDetailModal
        isOpen={isOpenDetail}
        onClose={onCloseDetail}
        exerciseId={selectedExerciseId}
      />
      <AddSetModal
        isOpen={isOpen}
        onClose={onClose}
        currentWorkoutSet={currentWorkoutSet}
        onAccept={handleAccept}
      />

    </Flex>
  )
}
