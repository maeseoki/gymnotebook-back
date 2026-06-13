import { Link } from 'expo-router'
import { Screen, Text } from '@/shared/ui/primitives'

export default function NotFound() {
  return (
    <Screen>
      <Text>Pantalla no encontrada.</Text>
      <Link href="/(authenticated)/(tabs)">Ir al inicio</Link>
    </Screen>
  )
}
