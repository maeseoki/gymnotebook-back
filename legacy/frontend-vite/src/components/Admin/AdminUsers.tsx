import { Text, useToast, IconButton, AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter, Button, Box, Flex } from '@chakra-ui/react'
import { useState, useEffect, useRef } from 'react'
import { deleteUser, getAllUsers } from '../../services/userService'
import { Roles, userResponse } from '../../types.d'
import { MdDeleteForever } from 'react-icons/md'

export default function AdminUsers () {
  const [users, setUsers] = useState<userResponse[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<number>()
  const onClose = () => setIsOpen(false)
  const toast = useToast()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      const usersFromApi = await getAllUsers()
      setUsers(usersFromApi)
    }

    void fetchUsers()
  }, [])

  const handleDelete = async (id: number) => {
    setUserToDelete(id)
    setIsOpen(true)
  }

  const confirmDelete = async () => {
    try {
      if (!userToDelete) return
      await deleteUser(userToDelete)
      setUsers(users.filter(user => user.id !== userToDelete))
      toast({
        title: 'Usuario eliminado',
        description: 'El usuario ha sido eliminado correctamente.',
        status: 'success',
        duration: 9000,
        isClosable: true
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error al eliminar el usuario.',
        status: 'error',
        duration: 9000,
        isClosable: true
      })
    } finally {
      setIsOpen(false)
    }
  }

  return (
    <Box>
      <Flex flexDir='column' alignItems='center' gap={4}>
        {users.map(user => (
          <Flex
            key={user.id}
            borderWidth='1px'
            borderRadius='lg'
            justifyContent='space-between'
            alignItems='center'
            w='100%'
            px={2}
            py={3}
          >
            <Box>
              <Box
                mt='1'
                fontWeight='semibold'
                as='h4'
                lineHeight='tight'
                isTruncated
              >
                {user.username}
              </Box>
              <Text mt='2'>{user.email}</Text>
            </Box>
            {!user.roles.find((role: { name: Roles }) => role.name === Roles.ROLE_ADMIN as Roles) &&
              <IconButton
                aria-label='Eliminar usuario'
                colorScheme='red'
                variant='outline'
                color='red.500'
                fontSize='2xl'
                icon={<MdDeleteForever />}
                onClick={async () => await handleDelete(user.id)}
              />}
          </Flex>
        ))}
      </Flex>
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize='lg' fontWeight='bold'>
              Eliminar Usuario
            </AlertDialogHeader>

            <AlertDialogBody>
              ¿Estás seguro? No podrás deshacer esta acción.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancelar
              </Button>
              <Button colorScheme='red' onClick={confirmDelete} ml={3}>
                Borrar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  )
}
