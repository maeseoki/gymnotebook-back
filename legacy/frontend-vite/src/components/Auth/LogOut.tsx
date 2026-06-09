import { AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, Button } from '@chakra-ui/react'
import { useContext, useRef, useState } from 'react'
import { IoLogOutOutline } from 'react-icons/io5'
import { AuthContext } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function LogOut () {
  const [isLogoutOpen, setIsLogoutOpen] = useState(false)
  const { removeUser } = useContext(AuthContext)
  const logoutRef = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()

  // Cierra el modal de logout
  const onLogoutClose = () => setIsLogoutOpen(false)

  // Abre el modal de logout
  const logout = async () => {
    setIsLogoutOpen(true)
  }

  // Desloguea al usuario
  const confirmLogout = async () => {
    removeUser()
    navigate('/login')
  }

  return (
    <>
      <Button
        rightIcon={<IoLogOutOutline />}
        variant='outline'
        colorScheme='red'
        onClick={logout}
      >Salir
      </Button>
      <AlertDialog
        isOpen={isLogoutOpen}
        leastDestructiveRef={logoutRef}
        onClose={onLogoutClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize='lg' fontWeight='bold'>
              Cerrar sesión
            </AlertDialogHeader>

            <AlertDialogBody>
              ¿Deseas cerrar sesión?
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={logoutRef} onClick={onLogoutClose}>
                Cancelar
              </Button>
              <Button colorScheme='red' onClick={confirmLogout} ml={3}>
                Cerrar sesión
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  )
}
