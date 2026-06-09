import { useState } from 'react'
import { LocalStorage } from '../types'

export const useLocalStorage = (key: string): LocalStorage => {
  const [value, setValue] = useState<string | null>(() => localStorage.getItem(key))

  const setItem = (value: string) => {
    localStorage.setItem(key, value)
    setValue(value)
  }

  const removeItem = () => {
    localStorage.removeItem(key)
    setValue(null)
  }

  return { value, setItem, removeItem }
}
