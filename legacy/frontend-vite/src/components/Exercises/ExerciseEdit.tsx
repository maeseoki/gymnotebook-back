import { useForm, Controller, FieldValues } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { Button, FormControl, FormLabel, Input, Textarea, Select, Image, Center, Icon, Stack, Text, useToast, Skeleton } from '@chakra-ui/react'
import { FaCamera } from 'react-icons/fa'
import { useDropzone } from 'react-dropzone'
import * as yup from 'yup'
import { useEffect, useState } from 'react'
import Compressor from 'compressorjs'
import { MuscleGroups, ExerciseType, GenericResponse, ExerciseTypeType, ExerciseTypeUpdate } from '../../types'
import { compressorConfig } from '../../utils/compressor'
import { uploadImage } from '../../services/imageService'
import { AxiosError } from 'axios'
import { createExercise, getExercise, updateExercise } from '../../services/exerciseService'
import { useNavigate, useParams } from 'react-router-dom'
import { exerciseTypeNames, muscleGroupNames } from '../../utils/maps'

// Validation schema
const schema = yup.object().shape({
  name: yup.string().required(),
  primaryMuscle: yup.string().required(),
  secondaryMuscle: yup.string().optional(),
  type: yup.string().required(),
  description: yup.string().optional()
})

export default function ExerciseEdit () {
  const [file, setFile] = useState<Blob | undefined>()
  const [urlImage, setUrlImage] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const { id } = useParams()
  const [exercise, setExercise] = useState<ExerciseType | null>(null)

  const onDrop = (acceptedFiles: Array<Blob | File>) => {
    // eslint-disable-next-line no-new
    new Compressor(acceptedFiles[0], {
      ...compressorConfig,
      success: (result) => {
        setFile(result)
      }
    })
  }

  const { getRootProps, getInputProps } = useDropzone({ onDrop })

  const { register, handleSubmit, control, formState: { errors }, setValue } = useForm({
    resolver: yupResolver(schema)
  })

  const onSubmit = async (data: FieldValues) => {
    setLoading(true)
    let imageId: number | null = null
    // Primero subimos la imagen
    try {
      if (file) {
        imageId = await uploadImage(file)
      }
    } catch (error) {
      const axiosError = error as AxiosError<GenericResponse>
      console.error(axiosError)
      setLoading(false)
      toast({
        description: 'Ha ocurrido un error al subir la imagen',
        status: 'error'
      })
      return
    }

    // Después creamos o actualizamos el ejercicio
    try {
      const exerciseData: ExerciseType = {
        id: exercise?.id,
        name: data.name,
        primaryMuscleGroup: data.primaryMuscle as MuscleGroups,
        secondaryMuscleGroup: data.secondaryMuscle ? data.secondaryMuscle as MuscleGroups : null,
        type: data.type as ExerciseTypeType,
        description: data.description,
        imageId
      }

      // Si estamos editando un ejercicio, usamos el método de update, si no, usamos el de create
      if (exercise?.id) {
        await updateExercise(exerciseData as ExerciseTypeUpdate)
      } else {
        await createExercise(exerciseData)
      }

      setLoading(false)
      toast({
        title: 'Ejercicio guardado',
        description: 'El ejercicio se ha guardado correctamente',
        status: 'success'
      })
      navigate(-1)
    } catch (error) {
      const axiosError = error as AxiosError<GenericResponse>
      console.error(axiosError)
      setLoading(false)
      toast({
        description: 'Ha ocurrido un error al guardar el ejercicio',
        status: 'error'
      })
    }
  }

  useEffect(() => {
    let imageAsUrl: string | undefined
    if (file) {
      imageAsUrl = URL.createObjectURL(file)
      setUrlImage(imageAsUrl)
    }

    return () => {
      if (imageAsUrl) {
        URL.revokeObjectURL(imageAsUrl)
      }
    }
  }, [file])

  // Si estamos editando un ejercicio, obtenemos sus datos y los seteamos en el formulario
  useEffect(() => {
    const fetchExercise = async () => {
      if (id) {
        const exercise = await getExercise(parseInt(id))
        setValue('name', exercise.name, { shouldValidate: true })
        setValue('primaryMuscle', exercise.primaryMuscleGroup, { shouldValidate: true })
        if (exercise.secondaryMuscleGroup) setValue('secondaryMuscle', exercise.secondaryMuscleGroup, { shouldValidate: false })
        setValue('type', exercise.type, { shouldValidate: true })
        if (exercise.description) setValue('description', exercise.description, { shouldValidate: false })
        setExercise(exercise)
      }
    }

    void fetchExercise()
  }, [id, setValue])

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={4}>
        <Center>
          <Skeleton isLoaded={!id || !!exercise}>
            <Center
              {...getRootProps()}
              border='2px dashed'
              borderRadius='50%'
              width={150}
              height={150}
              color='gray.400'
              position='relative'
              cursor='pointer'
            >

              <input {...getInputProps()} accept='image/*' capture />
              {urlImage
                ? <Image
                    borderRadius='50%'
                    src={urlImage}
                    boxSize='150px'
                    objectFit='cover'
                  />
                : exercise?.imageId
                  ? <Image
                      borderRadius='50%'
                      src={`${import.meta.env.VITE_API_URL as string}image/${exercise.imageId}`}
                      boxSize='150px'
                      objectFit='cover'
                    />
                  : <Icon as={FaCamera} boxSize={10} />}
            </Center>
          </Skeleton>
        </Center>
        <Skeleton isLoaded={!id || !!exercise}>
          <FormControl isInvalid={!!errors.name}>
            <FormLabel>Nombre del ejercicio <Text as='b' color='red.400'>*</Text></FormLabel>
            <Input defaultValue={exercise?.name} {...register('name')} />
          </FormControl>
        </Skeleton>

        <Skeleton isLoaded={!id || !!exercise}>
          <FormControl isInvalid={!!errors.primaryMuscle}>
            <FormLabel>Grupo muscular primario <Text as='b' color='red.400'>*</Text></FormLabel>
            <Controller
              name='primaryMuscle'
              control={control}
              defaultValue={exercise?.primaryMuscleGroup ?? ''}
              render={({ field }) => (
                <Select {...field}>
                  <option value='' disabled>Selecciona un grupo muscular</option>
                  {Object.entries(muscleGroupNames).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </Select>
              )}
            />
          </FormControl>
        </Skeleton>

        <Skeleton isLoaded={!id || !!exercise}>
          <FormControl isInvalid={!!errors.secondaryMuscle}>
            <FormLabel>Grupo muscular secundario</FormLabel>
            <Controller
              name='secondaryMuscle'
              control={control}
              defaultValue={exercise?.secondaryMuscleGroup ?? ''}
              render={({ field }) => (
                <Select {...field}>
                  <option value='' disabled>Selecciona un grupo muscular</option>
                  {Object.entries(muscleGroupNames).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </Select>
              )}
            />
          </FormControl>
        </Skeleton>

        <Skeleton isLoaded={!id || !!exercise}>
          <FormControl isInvalid={!!errors.type}>
            <FormLabel>Tipo de ejercicio <Text as='b' color='red.400'>*</Text></FormLabel>
            <Controller
              name='type'
              control={control}
              defaultValue={exercise?.type ?? ''}
              render={({ field }) => (
                <Select {...field}>
                  <option value='' disabled>Selecciona un tipo de ejercicio</option>
                  {Object.entries(exerciseTypeNames).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </Select>
              )}
            />
          </FormControl>
        </Skeleton>

        <Skeleton isLoaded={!id || !!exercise}>
          <FormControl isInvalid={!!errors.description}>
            <FormLabel>Descripción</FormLabel>
            <Textarea defaultValue={exercise?.description} {...register('description')} />
          </FormControl>
        </Skeleton>

        <Button
          type='submit'
          colorScheme='blue'
          isLoading={loading}
          loadingText='Guardando...'
        >
          Guardar ejercicio
        </Button>

      </Stack>
    </form>
  )
}
