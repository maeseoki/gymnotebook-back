import { Box, Button, Container, FormControl, FormLabel, HStack, Heading, Input, Stack, Text, useToast } from '@chakra-ui/react'
import { PasswordField } from './PasswordFIeld'
import Logo from '../Shared/Logo'
import { FormEvent, useState } from 'react'
import { loginUser } from '../../services/authService'
import { LoginRequest } from '../../types'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../hooks/userUser'
import { useGenericToast } from '../../hooks/useGenericToast'
import Copyright from '../Shared/Copyright'

export default function Login () {
  const navigate = useNavigate()
  const { addUser } = useUser()
  const toast = useToast()
  const { notImplementedToast } = useGenericToast()
  const [loading, setLoading] = useState(false)
  const [loginRequest, setLoginRequest] = useState<LoginRequest>({
    username: '',
    password: ''
  })

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await loginUser(loginRequest)
      addUser(response.accessToken)
      navigate('/')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Nombre de usuario o contraseña incorrectos',
        status: 'error',
        duration: 4000,
        isClosable: true
      })
      console.error('Error en la autenticación: ', error)
    } finally {
      setLoading(false)
    }
  }

  const passwordForgotten = () => {
    notImplementedToast()
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
            <Heading size={{ base: 'xs', md: 'sm' }}>Inicia sesión en tu cuenta</Heading>
            <HStack spacing='1' justify='center'>
              <Text color='muted' pe={1}>¿No tienes una cuenta?</Text>
              <Button variant='link' colorScheme='primary' onClick={() => navigate('/signUp')}>
                Créala aquí
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
          <form onSubmit={handleLogin}>
            <Stack spacing='6'>
              <Stack spacing='5'>
                <FormControl>
                  <FormLabel htmlFor='username'>Nombre de usuario</FormLabel>
                  <Input
                    id='username'
                    type='text'
                    value={loginRequest.username}
                    onChange={e => setLoginRequest({ ...loginRequest, username: e.target.value })}
                  />
                </FormControl>
                <PasswordField value={loginRequest.password} onChange={e => setLoginRequest({ ...loginRequest, password: e.target.value })} />
              </Stack>
              <HStack justify='flex-end'>
                <Button
                  variant='link'
                  colorScheme='primary'
                  size='sm'
                  onClick={passwordForgotten}
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              </HStack>
              <Stack spacing='6'>
                <Button
                  type='submit'
                  isLoading={loading}
                  loadingText='Calentando...'
                  variant='primarySolid'
                >Iniciar sesión
                </Button>
              </Stack>
            </Stack>
          </form>
        </Box>
      </Stack>
      <Copyright />
    </Container>
  )
}
