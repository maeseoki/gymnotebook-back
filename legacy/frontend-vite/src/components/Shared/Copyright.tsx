import { Box, Text } from '@chakra-ui/react'

export default function Copyright () {
  return (
    <Box textAlign='center' mt='8'>
      <Text fontSize='sm' color='muted'>
        &copy; {new Date().getFullYear()} Victor Casado Ugidos. Todos los derechos reservados.
      </Text>
    </Box>
  )
}
