import { Link } from 'expo-router'
import { Button, Card, Screen, Text } from '@/shared/ui/primitives'

export default function HomeScreen() {
  return (
    <Screen>
      <Card>
        <Text>Marcador de posición de inicio.</Text>
        <Link href="/(authenticated)/(tabs)/workout" asChild>
          <Button label="Abrir entrenamiento" />
        </Link>
      </Card>
    </Screen>
  )
}
