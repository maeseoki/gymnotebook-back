import { Heading, Flex, useColorModeValue, Box } from '@chakra-ui/react'
import { useLocation } from 'react-router-dom'
import { HeaderProps } from '../../types'

export default function Header ({ extraComponent }: HeaderProps) {
  const location = useLocation()

  const routesWithNames: { [key: string]: string } = {
    '/': 'The Gym Notebook',
    '/workout': 'Entrenamiento',
    '/exercises': 'Ejercicios',
    '/exercises/:id': 'Ejercicio',
    '/exercises/new': 'Nuevo Ejercicio',
    '/exercises/edit/:id': 'Editar Ejercicio',
    '/me': 'Mi Perfil',
    '/admin': 'Administración'
  }

  // Devolvemos el nombre de la ruta actual.
  const getRouteTitle = () => {
    if (location.pathname.match(/\/exercises\/edit\/\d+/)) {
      return routesWithNames['/exercises/edit/:id']
    }

    if (location.pathname.match(/\/exercises\/\d+/)) {
      return routesWithNames['/exercises/:id']
    }

    return routesWithNames[location.pathname]
  }

  return (
    <Box
      bottom={0}
      width='100%'
      boxShadow='0 2px 8px rgba(255, 189, 32, 0.05)'
      py={2}
      px={{ base: 4, md: 6, lg: 8 }}
      mb={2}
      bg={useColorModeValue('gray.100', 'gray.900')}
      borderBottom='1px solid'
      borderColor={useColorModeValue('gray.200', 'gray.700')}
    >
      <Flex
        justify='space-between'
        align='center'
      >
        <Heading
          as='h1'
          size='xl'
          background='gradients.primaryGradient'
          bgClip='text'
          fontWeight='extrabold'
        >
          {getRouteTitle()}
        </Heading>
        {extraComponent && extraComponent}
      </Flex>
    </Box>

  )
}
