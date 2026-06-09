import { useState, useEffect } from 'react'
import { Box, Button, Heading, Text, Flex, Image, LinkBox, LinkOverlay, Skeleton, useToast, Icon, HStack, SimpleGrid, Input, InputLeftElement, InputGroup } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { getAllExercises } from '../../services/exerciseService'
import { ExerciseTypeWithImage, ExercisesProps } from '../../types.d'
import defaultExerciseImg from '../../assets/images/default-exercise.jpg'
import { GiBiceps } from 'react-icons/gi'
import { IoBarbell } from 'react-icons/io5'
import { IoMdAdd, IoMdSearch } from 'react-icons/io'
import { muscleGroupNames, exerciseTypeNames } from '../../utils/maps'

export default function Exercises ({ onExerciseClick }: ExercisesProps) {
  const [exercises, setExercises] = useState<ExerciseTypeWithImage[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const toast = useToast()

  const filteredExercises = exercises.filter(exercise => exercise.name.toLowerCase().includes(searchQuery.toLowerCase()))

  // Cuando se monta el componente, obtenemos todos los ejercicios.
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const result = await getAllExercises()
        // Seteamos la imagen por defecto para cada ejercicio.
        setExercises(
          result.map((exercise: ExerciseTypeWithImage) => ({
            ...exercise,
            imageUrl: defaultExerciseImg
          }))
        )
      } catch (error) {
        console.error(error)
        toast({
          title: 'Error al obtener los ejercicios',
          description: 'Ha ocurrido un error al obtener los ejercicios',
          status: 'error'
        })
      } finally {
        setLoading(false)
      }
    }
    // Usamos void para que no se queje de que no estamos haciendo nada con la promesa (ya controlamos el error en el catch)
    void fetchExercises()
  }, [toast])

  return (
    <Box p={2} mx='auto'>
      <Heading
        as='h2'
        size='lg'
        mb={4}
        textAlign='center'
      >{onExerciseClick ? 'Selecciona un ejercicio' : 'Mis Ejercicios'}
      </Heading>
      <Button
        as={RouterLink}
        to='/exercises/new'
        leftIcon={<IoMdAdd />}
        variant='primaryOutline'
        width='full'
        mb={4}
      >Nuevo Ejercicio
      </Button>
      <InputGroup>
        <InputLeftElement pointerEvents='none'>
          <Icon as={IoMdSearch} boxSize={6} color='secondary.200' />
        </InputLeftElement>
        <Input
          type='text'
          placeholder='Buscar ejercicio'
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          variant='filled'
          mb={5}
        />
      </InputGroup>
      {filteredExercises.length === 0 && !loading && (
        <>
          <Heading
            as='h3'
            size='md'
            textAlign='center'
            mb={5}
          >Aún no tienes ningun ejercicio.
          </Heading>
          <Text textAlign='center' mb={5}>Crea uno nuevo para empezar a entrenar!</Text>
        </>
      )}
      <Skeleton isLoaded={!loading}>
        <Flex
          direction={{ base: 'column', sm: 'row' }}
          wrap={{ base: 'nowrap', sm: 'wrap' }}
          justifyContent='space-between'

        >
          {filteredExercises.map(exercise => (
            <LinkBox
              as={Flex}
              direction='column'
              borderWidth='1px'
              borderRadius='lg'
              overflow='hidden'
              w='full'
              p={{ base: 2, sm: 4 }}
              mb={4}
              cursor='pointer'
              key={exercise.id}
              role='group'
              onClick={() => onExerciseClick?.(exercise)}
            >
              <SimpleGrid
                columns={2}
                templateColumns='80px 2fr'
                alignItems='center'
                gap={{ base: 2, sm: 4 }}
              >
                <Image
                  borderRadius='full'
                  boxSize='60px'
                  border='1px dashed var(--chakra-colors-primary-400)'
                  src={exercise.imageId ? `${import.meta.env.VITE_API_URL as string}image/${exercise.imageId}` : defaultExerciseImg}
                  fallbackSrc={defaultExerciseImg}
                  alt={exercise.name}
                  loading='lazy'
                />
                <Box>
                  <Heading
                    as='h3'
                    size='md'
                    fontSize={{ base: 'lg', sm: 'xl' }}
                    mb={2}
                    _groupHover={{ color: 'primary.500' }}
                  >
                    {onExerciseClick // Si la prop onExerciseClick está definida, no usamos el LinkOverlay
                      ? <span>{exercise.name}</span>
                      : <LinkOverlay as={RouterLink} to={`/exercises/${exercise.id ?? 0}`}>{exercise.name}</LinkOverlay>}
                  </Heading>
                  <Flex justifyContent='space-between' wrap='wrap'>
                    <HStack><Icon as={GiBiceps} />
                      <Text fontSize='sm' color='gray.500' mb={2}>
                        {muscleGroupNames[exercise.primaryMuscleGroup]}
                        {exercise.secondaryMuscleGroup ? `, ${muscleGroupNames[exercise.secondaryMuscleGroup]}` : ''}
                      </Text>
                    </HStack>
                    <HStack><Icon as={IoBarbell} /> <Text fontSize='sm' color='gray.500' mb={2}>{exerciseTypeNames[exercise.type]}</Text></HStack>
                  </Flex>
                  <Text fontSize='sm'>{exercise.description}</Text>
                </Box>
              </SimpleGrid>
            </LinkBox>
          ))}
        </Flex>
      </Skeleton>
    </Box>
  )
}
