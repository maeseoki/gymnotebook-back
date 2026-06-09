import { useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { ExerciseDetailProps, ExerciseType, WorkoutSetResponse } from '../../types'
import { getWorkoutSetsByExerciseId } from '../../services/workoutSetService'
import { Card, CardBody, CardHeader, Flex, Heading, Link, Table, Tbody } from '@chakra-ui/react'
import SetsTableHead from '../Workout/SetsTableHead'
import Set from '../Workout/Set'

export default function ExerciseDetail ({ exerciseId }: ExerciseDetailProps) {
  const [workoutSets, setWorkoutSets] = useState<WorkoutSetResponse[]>([])
  const [exercise, setExercise] = useState<ExerciseType>(null as unknown as ExerciseType)
  const [loading, setLoading] = useState(true)
  const { id } = useParams()
  let editable = false

  if (!exerciseId) {
    exerciseId = Number(id)
    editable = true
  }

  const formatDate = (date: string) => {
    const dateObj = new Date(date)

    return `${dateObj.toLocaleString('es-ES', { dateStyle: 'short' })} - ${dateObj.toLocaleString('es-ES', { timeStyle: 'short' })}`
  }

  useEffect(() => {
    const getWorkoutSets = async () => {
      const workoutSetResponse = await getWorkoutSetsByExerciseId(exerciseId ?? 0)
      setWorkoutSets(workoutSetResponse.content)
      setExercise(workoutSetResponse.content[0]?.exercise) // Todos los workoutSets tienen el mismo ejercicio
    }

    try {
      setLoading(true)
      void getWorkoutSets()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [exerciseId])

  return (
    <>
      <Flex justify='space-between' alignItems='baseline' pb={2}>
        <Heading as='h2'> {exercise?.name} </Heading>
        {editable && <Link as={RouterLink} to={`/exercises/edit/${exerciseId ?? 0}`} color='red.300'>Editar ejercicio</Link>}
      </Flex>
      <Flex
        direction='column'
        alignItems='center'
        mb={4}
        gap={4}
      >
        {!loading &&
        workoutSets.length > 0
          ? workoutSets.map((workoutSet: WorkoutSetResponse) => (
            <Card key={workoutSet.id} w='full'>
              <CardHeader p={2}>
                <Heading
                  as='h3'
                  size='sm'
                  textAlign='center'
                  color='primary.500'
                > {formatDate(workoutSet.startDate)}
                </Heading>
              </CardHeader>
              <CardBody p={2}>
                <Table>
                  <SetsTableHead exerciseType={exercise.type} />
                  <Tbody>
                    {workoutSet.sets?.map((set, i) => (
                      <Set
                        key={i}
                        index={i}
                        reps={set.reps}
                        weight={set.weight}
                        time={set.time}
                        distance={set.distance}
                        isDropSet={set.dropSet}
                        exerciseType={workoutSet.exercise.type}
                        startDate={new Date(set.startDate)}
                      />
                    )
                    )}
                  </Tbody>
                </Table>
              </CardBody>
            </Card>
          ))
          : <Heading as='h3' size='md' textAlign='center'>Cargando..</Heading>}
        {loading && <Heading as='h3' size='md' textAlign='center'>Cargando...</Heading>}
      </Flex>
    </>
  )
}
