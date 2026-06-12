import { Link } from 'expo-router'
import { Screen, Text } from '@/shared/ui/primitives'

export default function NotFound() {
  return (
    <Screen>
      <Text>Screen not found.</Text>
      <Link href="/(authenticated)/(tabs)">Go home</Link>
    </Screen>
  )
}
