import { Navigate, Outlet } from 'react-router-dom'
import { Container } from '@chakra-ui/react'
import { AuthContext } from './context/AuthContext'
import { useUser } from './hooks/userUser'
import MainNavigation from './components/Shared/MainNavigation'
import Header from './components/Shared/Header'
import { WorkoutContext } from './context/WorkoutContext'
import { useState, useEffect } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import { Workout } from './types'
import { useAutoAnimate } from '@formkit/auto-animate/react'

export default function App () {
  const { user, addUser: setUser, removeUser } = useUser()
  const { value: savedWorkout, setItem: saveWorkout, removeItem: removeSavedWorkout } = useLocalStorage('workout')

  // Creamos el estado del workout. Si hay un workout guardado en localStorage, lo cargamos como valor inicial.
  const [workout, setWorkout] = useState<Workout | null>(() => {
    return savedWorkout ? JSON.parse(savedWorkout) : null
  })
  const [animationParent] = useAutoAnimate()

  useEffect(() => {
    // Cada vez que el workout cambie, lo guardamos en localStorage para mantenerlos sincronizados.
    if (workout) {
      saveWorkout(JSON.stringify(workout))
    } else {
      removeSavedWorkout()
    }
  }, [workout, saveWorkout, removeSavedWorkout])

  if (user === null) {
    return (
      <Navigate to='/login' />
    )
  } else {
    return (
      <AuthContext.Provider value={{ user, setUser, removeUser }}>
        <WorkoutContext.Provider value={{ workout, setWorkout }}>
          <Header />
          <Container
            maxW='2xl'
            minH='calc(100vh - 5rem)'
            pb={12}
            pt={0}
            px={{ base: '2', sm: '8' }}
            ref={animationParent}
          >
            <Outlet />
          </Container>
          <MainNavigation />
        </WorkoutContext.Provider>
      </AuthContext.Provider>
    )
  }
}
