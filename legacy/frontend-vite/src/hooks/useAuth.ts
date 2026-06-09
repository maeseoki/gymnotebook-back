import { useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { useUser } from './userUser'

export const useAuth = () => {
  const { user, addUser, removeUser } = useUser()
  const { value } = useLocalStorage('token')

  useEffect(() => {
    if (value !== null) {
      addUser(JSON.parse(value))
    }
  }, [addUser, value])

  const login = (token: string) => {
    addUser(token)
  }

  const logout = () => {
    removeUser()
  }

  return { user, login, logout }
}
