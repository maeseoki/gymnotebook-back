import { Auth, Role, Roles, User } from '../types'
import { useLocalStorage } from './useLocalStorage'
import { parseJwt } from '../utils/helpers'

export const useUser = (): Auth => {
  const { value: token, setItem, removeItem } = useLocalStorage('token')

  const addUser = (token: string | null) => {
    if (token === null) {
      removeItem()
    } else {
      setItem(token)
    }
  }

  const removeUser = () => {
    removeItem()
  }

  // Si el token no existe, no está autenticado
  if (token === null) return { user: null, addUser, removeUser }

  const decodedToken = parseJwt(token)

  // Si el token no es válido, no está autenticado
  if (decodedToken === null) return { user: null, addUser, removeUser }

  // Si el token ha expirado, no está autenticado
  const now = Date.now().valueOf() / 1000
  if (decodedToken.exp < now) return { user: null, addUser, removeUser }

  // Extraemos los roles a un array de strings
  const roles: Roles[] = decodedToken.roles.map((role: Role) => role.authority)

  const user: User = {
    authenticated: true,
    name: decodedToken.sub,
    authToken: token,
    roles,
  }

  return { user, addUser, removeUser }
}
