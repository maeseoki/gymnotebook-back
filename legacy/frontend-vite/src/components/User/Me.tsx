import { Alert, AlertDescription, AlertIcon, AlertTitle, Avatar, Card, CardHeader, Flex, Heading, VStack } from '@chakra-ui/react'
import { useContext } from 'react'
import { GiTrafficCone } from 'react-icons/gi'
import { AuthContext } from '../../context/AuthContext'
import LogOut from '../Auth/LogOut'
import WorkoutsCalendar from './WorkoutsCalendar'

export default function Me () {
  const { user } = useContext(AuthContext)
  // Monstramos un Alert diciendo que estamos en beta, y que no se puede acceder a esta página.
  return (
    <>
      <Card
        shadow='md'
        borderWidth='1px'
        borderRadius='md'
        overflow='hidden'
        borderColor='whiteAlpha.300'
        mb={4}
      >
        <CardHeader borderBottomWidth='1px'>
          <Flex gap='4'>
            <Avatar name={user?.name} />
            <VStack alignItems='flex-start'>
              <Heading as='h2' size='md'>{user?.name}</Heading>
              {/* <Heading as='h3' size='sm'>{user?.email}</Heading> */}
            </VStack>
            <Flex flex='1' justifyContent='flex-end' alignItems='center'>
              <LogOut />
            </Flex>
          </Flex>
        </CardHeader>
      </Card>
      <Alert
        status='info'
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
          ¡No disponible!
        </AlertTitle>
        <AlertDescription maxWidth='sm'>
          Esta página aún no está disponible. ¡Pero no te preocupes! Estamos trabajando en ello.
        </AlertDescription>
      </Alert>
      <WorkoutsCalendar />
    </>
  )
}
