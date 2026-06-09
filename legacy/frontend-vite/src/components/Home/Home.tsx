import { useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { AuthContextData } from '../../types'
import { Button, Alert, AlertDescription, AlertIcon, AlertTitle, HStack } from '@chakra-ui/react'
import { GiTrafficCone } from 'react-icons/gi'
import { Link as RouterLink } from 'react-router-dom'

export default function Home () {
  const { user } = useContext<AuthContextData>(AuthContext)
  return (
    <Alert
      status='warning'
      variant='subtle'
      flexDirection='column'
      alignItems='center'
      justifyContent='center'
      textAlign='center'
      py={6}
    >
      <AlertIcon as={GiTrafficCone} boxSize='40px' mr={0} />
      <AlertTitle
        mt={4}
        mb={1}
        me={0}
        fontSize='lg'
      >
        Bienvenido {user?.name ?? 'de nuevo'}!
      </AlertTitle>
      <AlertDescription maxWidth='sm'>
        Recuerda que aún estamos en fase Beta. Puede que haya algo que no funcione. ¡No te preocupes! Estamos trabajando en ello 👷
      </AlertDescription>
      <HStack spacing={2} mt={4}>
        <Button as={RouterLink} to='/workout'>¡Entrenar!</Button>
      </HStack>
    </Alert>
  )
}
