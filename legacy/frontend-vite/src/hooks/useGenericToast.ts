import { useToast } from '@chakra-ui/react'

export const useGenericToast = () => {
  const toast = useToast()

  const notImplementedToast = () => {
    toast({
      title: 'No implementado',
      description: 'Esta característica aún no está implementada. ¡Seguimos en beta!',
      status: 'warning'
    })
  }

  const betaToast = () => {
    toast({
      title: 'Beta',
      description: 'Esta característica está en beta. ¡Seguimos trabajando!',
      status: 'warning'
    })
  }

  const errorToast = (title: string, description: string) => {
    toast({
      title,
      description,
      status: 'error'
    })
  }

  return { notImplementedToast, betaToast, errorToast }
}
