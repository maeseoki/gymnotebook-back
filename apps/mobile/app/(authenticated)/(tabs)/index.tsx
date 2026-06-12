import { Link } from 'expo-router'
import { Button, Card, Screen, Text } from '@/shared/ui/primitives'

export default function HomeScreen() {
  return (
    <Screen>
      <Card>
        <Text>Home foundation placeholder.</Text>
        <Link href="/(authenticated)/(tabs)/workout" asChild>
          <Button label="Open workout" />
        </Link>
      </Card>
    </Screen>
  )
}
