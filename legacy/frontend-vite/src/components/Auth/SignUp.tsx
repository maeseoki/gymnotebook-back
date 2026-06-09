import { useToast, Container, Box, Stack, Heading, HStack, Button, FormControl, FormLabel, Input, Text } from '@chakra-ui/react'
import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { signUpUser } from '../../services/authService'
import Logo from '../Shared/Logo'
import { PasswordField } from './PasswordFIeld'
import { SignUpRequest, SignUpResponse } from '../../types'
import { AxiosError } from 'axios'

export default function SignUp () {
  const navigate = useNavigate()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [signupRequest, setSignupRequest] = useState<SignUpRequest>({
    username: '',
    password: '',
    email: ''
  })

  const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Validamos con regex el que nombre de usuario sea [az-AZ-09] y que tenga entre 4 y 20 caracteres
    const usernameRegex = /^[a-zA-Z0-9]{4,20}$/
    if (!usernameRegex.test(signupRequest.username)) {
      toast({
        description: 'El nombre de usuario debe tener entre 4 y 20 caracteres y solo puede contener letras y números',
        status: 'warning'
      })
      return

      // Validamos con regex el que el email sea válido
    } else if (signupRequest.email.match(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/) == null) {
      toast({
        description: 'El email no es válido',
        status: 'warning'
      })
      return

      // Validamos con regex el que la contraseña tenga entre 8 y 20 caracteres, al menos una letra mayúscula, una minúscula y un número
    } else if (signupRequest.password.match(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,20}$/) == null) {
      toast({
        description: 'La contraseña debe tener entre 8 y 20 caracteres, al menos una letra mayúscula, una minúscula y un número',
        status: 'warning'
      })
      return
    }

    setLoading(true)
    try {
      const response = await signUpUser(signupRequest)
      navigate('/login') // Redirigiendo a la página de login después de crear la cuenta
      toast({
        title: response.message,
        description: 'Inicia sesión para empezar',
        status: 'success'
      })
    } catch (error) {
      const axiosError = error as AxiosError<SignUpResponse>
      toast({
        title: 'Error',
        description: axiosError.response?.data?.message,
        status: 'error'
      })
      console.error('Error during signup: ', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxW='lg' py={{ base: '12', md: '24' }} px={{ base: '2', sm: '8' }}>
      <Stack spacing='8'>
        <Stack spacing='6'>
          <Logo />
          <Heading as='h1' size='xl' textAlign='center'>
            The Gym Notebook
          </Heading>
          <Stack spacing={{ base: '2', md: '3' }} textAlign='center'>
            <Heading size={{ base: 'xs', md: 'sm' }}>Crea una nueva cuenta</Heading>
            <HStack spacing='1' justify='center'>
              <Text color='muted' pe={1}>¿Ya tienes una cuenta?</Text>
              <Button variant='link' colorScheme='primary' onClick={() => navigate('/login')}>
                Inicia sesión aquí
              </Button>
            </HStack>
          </Stack>
        </Stack>
        <Box
          py={{ base: '4', sm: '8' }}
          px={{ base: '4', sm: '10' }}
          bg={{ base: 'gray.900', sm: 'bg-surface' }}
          boxShadow={{ base: 'md' }}
          borderRadius={{ base: 'xl' }}
        >
          <form onSubmit={handleSignUp}>
            <Stack spacing='6'>
              <Stack spacing='5'>
                <FormControl>
                  <FormLabel htmlFor='username'>Nombre de usuario</FormLabel>
                  <Input
                    id='username'
                    type='text'
                    value={signupRequest.username}
                    onChange={e => setSignupRequest({ ...signupRequest, username: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel htmlFor='email'>Email</FormLabel>
                  <Input
                    id='email'
                    type='email'
                    value={signupRequest.email}
                    onChange={e => setSignupRequest({ ...signupRequest, email: e.target.value })}
                  />
                </FormControl>
                <PasswordField value={signupRequest.password} onChange={e => setSignupRequest({ ...signupRequest, password: e.target.value })} />
              </Stack>
              <Stack spacing='6'>
                <Button
                  type='submit'
                  isLoading={loading}
                  loadingText='Creando...'
                  variant='outline'
                >Crear cuenta
                </Button>
              </Stack>
            </Stack>
          </form>
        </Box>
      </Stack>
    </Container>
  )
}
